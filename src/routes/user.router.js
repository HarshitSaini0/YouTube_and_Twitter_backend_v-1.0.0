import { Router } from "express";
import {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    updateUsername,
    updateEmailID,
    updateUserAvatar,
    updateUserCoverImage
} from "../controllers/user.controller.js";
import { upload } from '../middlewares/multer.middleware.js';
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.route('/register').post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1,
        },
        {
            name: "coverImage",
            maxCount: 1,
        }

    ]),
    registerUser
)
router.route('/login').post(loginUser)

//secured routes 
router.route('/logout').post(verifyJWT, logoutUser)
router.route('/change-password').patch(verifyJWT, changeCurrentPassword)
router.route('/change-username').patch(verifyJWT, updateUsername)
router.route('/change-email').patch(verifyJWT, updateEmailID)
router.route('/change-avatar').patch(verifyJWT, upload.fields([{ name: "avatar", maxCount: 1, }]), updateUserAvatar)
router.route('/change-coverImage').patch(verifyJWT, upload.fields([{ name: "coverImage", maxCount: 1, }]), updateUserCoverImage)


router.route('/refresh-token').post(refreshAccessToken)


export default router;



