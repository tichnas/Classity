const express = require('express');

// middlewares
const auth = require('../../middleware/auth');
const classroomAuth = require('../../middleware/classroomAuth');

// Models
const Comment = require('../../models/Comment');

// Initialize router
const router = express.Router();

// ----------------------------------- Routes ------------------------------------------

/**
 * @route		PUT api/comment/:commentId/like
 * @description Like a comment
 * @access		private + classroomOnly
 */

router.put('/:commentId/like', [auth, classroomAuth], async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.commentId);

        if (
            comment.likes.findIndex(user => String(user) === req.user.id) === -1
        ) {
            comment.likes.push(req.user.id);

            await comment.save();

            res.json(comment.likes);
        } else {
            res.status(400).json({ msg: 'Comment already liked' });
        }
    } catch (err) {
        res.status(500).json({ msg: 'Server Error' });
    }
});

/**
 * @route		DELETE api/comment/:commentId/like
 * @description Unlike a comment
 * @access		private + classroomOnly
 */

router.delete('/:commentId/like', [auth, classroomAuth], async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.commentId);
        const index = comment.likes.findIndex(
            user => String(user) === req.user.id
        );

        if (index !== -1) {
            comment.likes.splice(index, 1);

            await comment.save();

            res.json(comment.likes);
        } else {
            res.status(400).json({ msg: 'Comment not liked' });
        }
    } catch (err) {
        res.status(500).json({ msg: 'Server Error' });
    }
});

/**
 * @route		PUT api/comment/:commentId/reply
 * @description Reply to a comment
 * @access		private + classroomOnly
 */

router.put('/:commentId/reply', [auth, classroomAuth], async (req, res) => {
    try {
        const text = req.body.text;
        const userId = req.user.id;

        if (!text) {
            return res.status(400).json({ msg: 'Bad Request' });
        }

        const newComment = await Comment.findOneAndUpdate(
            { _id: req.params.commentId },
            { $push: { reply: { userId, text } } },
            { new: true }
        );

        res.json(newComment.reply);
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Server Error' });
    }
});

module.exports = router;