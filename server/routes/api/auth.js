const express = require('express');
const { check, validationResult } = require('express-validator');

const auth = require('../../middleware/auth');

// Models
const userModels = require('../../models/User');

const User = userModels.User;
const EmailUser = userModels.EmailUser;

// Initialize router
const router = express.Router();

//--------------------------------------ROUTES ------------------------------------------------------------------------------

/**
 * @route		POST api/auth
 * @description Login user to get the token
 * @access		public
 */
router.post(
    '/',
    [
        check('email', 'Please enter a valid email').isEmail(),
        check('password', 'Password required').exists()
    ],
    async (req, res) => {
        // check for errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json(errors);
        }
        try {
            // get email password
            const { email, password } = req.body;

            // get user from db
            let user = await EmailUser.findOne({ email });

            // if there is no user
            if (!user) {
                return res.status(401).json({ errors: [{ msg: 'Invalid Credentials' }] });
            }

            if (!user.emailVerified()) {
                return res.json({ inactive: true, nextTokenRequest: user.nextTokenRequest });
            }

            // check the password
            const isMatch = await user.checkPassword(password);

            // if password doesnt match
            if (!isMatch) {
                return res.status(401).json({ errors: [{ msg: 'Invalid Credentials' }] });
            }

            // Send back token if credentials are correct
            const token = user.generateJWT();
            return res.json({ token });
        } catch (err) {
            console.error(err.message);
            res.status(500).json({ errors: [{ msg: 'Server Error' }] });
        }
    }
);

/**
 * @route           GET api/auth
 * @description     get user credentials with token
 * @access          private
 */
router.get('/', auth, async (req, res) => {
    try {
        //get user form db
        const user = await User.findById(req.user.id).select('-password -googleId');

        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ errors: [{ msg: 'Server Error' }] });
    }
});

module.exports = router;
