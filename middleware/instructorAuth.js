const Course = require('../models/Course');

/**
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @description middleware to check if the user is instructor of course
 */
const instructorAuth = async (req, res, next) => {
    const courseId = req.params.courseId;

    if (!courseId) {
        return res.status(400).json({
            msg: 'Course Id not found'
        });
    }

    try {
        const course = await Course.findById(courseId).select('instructor');
        if (course.instructor.toString() !== req.user.id) {
            return res
                .status(401)
                .json({ msg: 'Not authorized to edit course' });
        }
        next();
    } catch (err) {
        return res.status(500).json({ msg: 'Server error' });
    }
};

module.exports = instructorAuth;