const express = require('express');
const mongoose = require('mongoose');
const { check, validationResult } = require('express-validator');

// middlewares
const instructorAuth = require('../../middleware/instructorAuth');
const studentAuth = require('../../middleware/studentAuth');
const classroomAuth = require('../../middleware/classroomAuth');

// Models
const Topic = require('../../models/Topic');
const Comment = require('../../models/Comment');
const Test = require('../../models/Test');

// Initialize router
const router = express.Router();

// ----------------------------------- Routes ------------------------------------------

/**
 * @route		GET api/topic/:topicId
 * @description Get all topic data with topic ID
 * @access		public
 */
router.get('/:topicId', classroomAuth, async (req, res) => {
    try {
        const topic = await Topic.findById(req.params.topicId)
            .lean()
            .populate('resourceDump')
            .populate('doubt');
        if (!topic) {
            return res.status(400).json({ errors: [{ msg: 'Topic not found' }] });
        }

        res.json(topic);
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).json({ errors: [{ msg: 'Invalid Topic Id' }] });
        }
        console.error(err.message);
        res.status(500).json({ errors: [{ msg: 'Server Error' }] });
    }
});

/**
 * @route		PATCH api/topic/:topicId
 * @description Change name/description of topic
 * @access		private + instructorOnly
 */
router.patch('/:topicId', instructorAuth, async (req, res) => {
    try {
        const { name, description } = req.body;
        const change = {};
        if (name) change.name = name;
        if (description) change.description = description;

        const topic = await Topic.findOneAndUpdate({ _id: req.params.topicId }, change, {
            new: true
        });

        res.json(topic);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ errors: [{ msg: 'Server Error' }] });
    }
});

/**
 * @route		PUT api/topic/:topicId/coreResource
 * @description Add/Delete/Update core resource to topic
 * @access		private + instructorOnly
 */
router.put('/:topicId/coreResource', instructorAuth, async (req, res) => {
    try {
        req.body.forEach((resource, i, arr) => {
            if (
                !['text', 'video', 'test'].includes(resource.kind) ||
                !resource.name ||
                (!resource.payload && !resource.text && !resource.url && !resource.testId)
            ) {
                throw new Error('Bad Request');
            }

            if (resource.text) resource.payload = resource.text;
            if (resource.url) resource.payload = resource.url;
            if (resource.testId) resource.payload = resource.testId;

            arr[i] = {
                kind: resource.kind,
                name: resource.name,
                text: resource.payload,
                url: resource.payload,
                testId: resource.payload,
                _id: resource._id || new mongoose.Types.ObjectId().toHexString()
            };
        });

        const topic = await Topic.findOneAndUpdate(
            { _id: req.params.topicId },
            { coreResources: req.body },
            { new: true }
        );

        res.json(topic.coreResources);
    } catch (err) {
        if (err.message === 'Bad Request') {
            return res.status(400).json({ errors: [{ msg: 'Invalid data' }] });
        }
        console.error(err.message);
        res.status(500).json({ errors: [{ msg: 'Server Error' }] });
    }
});

/**
 * @route		PUT api/topic/:topicId/comment/:type(resourceDump|doubt)
 * @description Add student's resource/doubt
 * @access		private + studentOnly
 */
router.put('/:topicId/comment/:type(doubt|resourceDump)', studentAuth, async (req, res) => {
    try {
        const { type, topicId } = req.params;
        const user = req.user.id;
        const text = req.body.text;

        if (!text) {
            return res.status(400).json({ errors: [{ msg: 'Text not found' }] });
        }

        const comment = new Comment({ user, topic: topicId, text });
        const commentPromise = comment.save();

        const topicPromise = Topic.findOneAndUpdate(
            { _id: topicId },
            { $push: { [type]: comment.id } },
            { new: true }
        ).populate(type);

        const [newTopic] = await Promise.all([topicPromise, commentPromise]);

        res.json(newTopic[type]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ errors: [{ msg: 'Server Error' }] });
    }
});

/**
 * @route		POST api/topic/:topicId/test
 * @description Add a test and get test-id
 * @access		private + instructorOnly
 */
router.post(
    '/:topicId/test',
    [
        instructorAuth,
        [
            check('name', "Can't be empty").not().isEmpty(),
            check('questions', "questions can't be empty").not().isEmpty()
        ]
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json(errors);
        }
        try {
            const pos = req.body.position;
            const name = req.body.name;
            // now remove the postion
            delete req.body.position;
            delete req.body.name;

            // Create test object
            const test = new Test({
                ...req.body,
                topic: req.params.topicId
            });

            // check for errors
            const ValidationErrors = test.validateSync();
            if (ValidationErrors) {
                const error_messages = {},
                    errors = ValidationErrors.errors;
                for (let field in errors) error_messages[field] = errors[field].message;
                return res.status(400).json({ errors: error_messages });
            }

            // save the test
            const testPromise = test.save();

            // add test to topic
            const topicPromise = Topic.findOneAndUpdate(
                { _id: req.params.topicId },
                {
                    $push: {
                        coreResources: {
                            $each: [
                                {
                                    kind: 'test',
                                    testId: test.id,
                                    name
                                }
                            ],
                            $position: pos
                        }
                    }
                }
            );

            await Promise.all([testPromise, topicPromise]);

            res.json(test);
        } catch (err) {
            console.error(err.message);
            res.status(500).json({ errors: [{ msg: 'Server Error' }] });
        }
    }
);

/**
 * @route		DELETE api/topic/:topicId/comment/:commentId
 * @description Delete a comment
 * @access		private + studentOnly
 */
router.delete('/:topicId/comment/:commentId', studentAuth, async (req, res) => {
    try {
        const { topicId, commentId } = req.params;

        const comment = await Comment.findById(commentId).select('user');

        if (!comment) {
            return res.status(400).json({ errors: [{ msg: 'Comment not found' }] });
        }

        if (String(comment.user) !== req.user.id) {
            return res.status(401).json({
                errors: [{ msg: 'Not authorized to delete comment' }]
            });
        }

        const commentPromise = Comment.findOneAndDelete({ _id: commentId });

        const topicPromise = Topic.findOneAndUpdate(
            { _id: topicId },
            { $pull: { doubt: commentId, resourceDump: commentId } },
            { new: true }
        );

        const [newTopic] = Promise.all([topicPromise, commentPromise]);

        res.json({
            doubt: newTopic.doubt,
            resourceDump: newTopic.resourceDump
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).json({ errors: [{ msg: 'Invalid data' }] });
        }
        console.error(err.message);
        res.status(500).json({ errors: [{ msg: 'Server Error' }] });
    }
});

/**
 * @route		DELETE api/topic/:topicId/coreResource/:resourceId
 * @description Delete a core resource
 * @access		private + instructorOnly
 */
router.delete('/:topicId/coreResource/:resourceId', instructorAuth, async (req, res) => {
    try {
        const { topicId, resourceId } = req.params;

        const topic = await Topic.findById(topicId).select('course coreResources');
        const coreResources = topic.coreResources;

        const index = coreResources.findIndex(resource => String(resource.id) === resourceId);

        if (index === -1) {
            return res.status(400).json({ errors: [{ msg: 'Core resource not found' }] });
        }

        if (coreResources[index].kind === 'test') {
            await Test.findOneAndDelete({
                _id: coreResources[index].testId
            });
        }

        coreResources.splice(index, 1);

        topic.coreResources = coreResources;
        await topic.save();

        res.json({ coreResources });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ errors: [{ msg: 'Server Error' }] });
    }
});

module.exports = router;
