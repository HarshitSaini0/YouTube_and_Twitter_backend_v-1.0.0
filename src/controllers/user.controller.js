import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/apiError.js'
import { User } from '../models/user.model.js'
import { uploadOverCloudinary, deleteFromCloudinary } from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/apiResponse.js'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import mongoose from 'mongoose'

const generateAccessAndRefreshToken = async (userID) => {
    try {
        const user = await User.findById(userID);
        const _accessToken = await user.generateAccessToken();
        const _refreshToken = await user.generateRefreshToken();
        user.refreshToken = _refreshToken;
        await user.save({ ValidateBeforeSave: false });
        return { _refreshToken, _accessToken }
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access and refresh token");
    }
}

const registerUser = asyncHandler(async (req, res) => {
    const { username, email, password, fullName } = req.body;
    // mea validation baad me dalu ga 

    // throw error
    if ([email, password, fullName, username].some((fields) => fields?.trim() === "")) {
        throw new ApiError(400, "All fields are required!!!");
    }

    const theUser = await User.findOne(
        {
            $or:
                [{
                    username: username
                }, {
                    email: email
                }]
        })
    if (theUser) {
        throw new ApiError(409, "User already exist");
    }
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    let coverImageLocalPath;
    if (
        req.files.coverImage
        && Array.isArray(req.files.coverImage)
        && req.files.coverImage.length > 0
    ) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }


    if (!avatarLocalPath) {
        throw new ApiError(409, "Avatar image is required")
    }
    const avatar = await uploadOverCloudinary(avatarLocalPath);
    const coverImage = await uploadOverCloudinary(coverImageLocalPath);
    if (!avatar) {
        throw new ApiError(409, "Avatar image is required")
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        username: username.toLowerCase(),
        password

    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }


    return res.status(201).json(
        new ApiResponse(201, createdUser, "User registered successfully")
    )
    // const user = await User.create({
    //     username,email,password,fullName
    //     })





})

const loginUser = asyncHandler(async (req, res) => {
    // todos 
    // get data
    // validate
    // find the user if there is one 
    // assign token 
    // give access
    const { username, email, password } = req.body;
    console.log('\n\n\n\n', username, email, password, req.body);
    if (!username && !email) {
        throw new ApiError(400, "Please provide username or email and password")
    }
    const user = await User.findOne({
        $or: [{ username: username.toLowerCase() }, { email }]
    });
    if (!user) {
        throw new ApiError(401, "User not found");
    }
    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid password");
    }
    const { _accessToken, _refreshToken } = await generateAccessAndRefreshToken(user._id);
    const loggedInUser = await User.findById(user._id).select('-password -refreshToken')
    const options = {
        httpOnly: true,
        secure: true,

    }
    res
        .status(200)
        .cookie("accessToken", _accessToken, options)
        .cookie("refreshToken", _refreshToken, options)
        .json(new ApiResponse(
            200,
            {
                user: loggedInUser
                , _accessToken
                , _refreshToken
            }
            , "User loggedIn successfully"
        ))


})

const logoutUser = asyncHandler(async (req, res) => {
    //todos
    //clear cookies
    //logout user
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1
            }
        },
        {
            new: true
        }
    )
    const options = {
        httpOnly: true,
        secure: true,

    }
    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "user logged out"))

})

const refreshAccessToken = asyncHandler(async (req, res) => {
    try {
        const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
        if (!incomingRefreshToken) {
            throw new ApiError(401, "unauthorized access")
        }
        const decodedRefreshToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
        console.log(decodedRefreshToken);
        const user = await User.findById(decodedRefreshToken?.id);
        console.log(user);
        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "refresh token is expired or used")
        }
        const options = {
            httpOnly: true,
            secure: true
        }
        const { _refreshToken, _accessToken } = await generateAccessAndRefreshToken(user._id);
        return res
            .status(200)
            .cookie("refreshToken", _refreshToken, options)
            .cookie("accessToken", _accessToken, options)
            .json(new ApiResponse(201,
                {
                    accessToken: _accessToken, refreshToken: _refreshToken
                },
                "Access token Refreshed"
            ))
    } catch (error) {
        throw new ApiError(500, error?.message || "Something went wrong while refreshing the token")
    }

})
const changeCurrentPassword = asyncHandler(async (req, res) => {

    try {
        const { oldPassword, newPassword } = req.body
        const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
        if (!incomingRefreshToken) {
            throw new ApiError(401, "unauthorized access")
        }
        const decodedRefreshToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
        const user = await User.findById(decodedRefreshToken?.id)
        if (!user) {
            throw new ApiError(401, "Invalid access token")
        }


        const isMatch = await user.isPasswordCorrect(oldPassword)
        if (!isMatch) {
            throw new ApiError(401, "Old password is incorrect")
        }


        user.password = newPassword
        await user.save({ ValidateBeforeSave: false })
        return res.status(200).json(new ApiResponse(200, {}, "Password changed successfully"))
    } catch (error) {
        throw new ApiError(500, error?.message || "Something went wrong while changing the password")
    }
})

const getCurrentUser = asyncHandler(asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(new ApiResponse(200, req.user, "Current User fetched successfully"))
}))

const updateEmailID = asyncHandler(async (req, res) => {
    try {
        const { email } = req.body;
        const emailAlreadyExist = await User.find({ email: email });
        if (!(emailAlreadyExist.length > 0)) {
            throw new ApiError(403, "Email is already in use")
        }
        User.findByIdAndUpdate(
            req.user._id,
            { $set: { email: email } },
        ).select("-password");
        return res.status(200).json(new ApiResponse(200, {}, "Email updated successfully"));
    } catch (error) {
        throw new ApiError(500, error?.message || "Something went wrong while updating the email");
    }

})

const updateUsername = asyncHandler(async (req, res) => {
    try {
        const { username } = req.body;
        const emailAlreadyUsername = await User.find({ username: username });
        if (!(emailAlreadyUsername.length > 0)) {
            throw new ApiError(403, "Username is already in use")
        }
        await User.findByIdAndUpdate(
            req.user._id,
            { $set: { username: username } },
        ).select("-password");
        return res.status(200).json(new ApiResponse(200, {}, "Username updated successfully"));
    } catch (error) {
        throw new ApiError(500, error?.message || "Something went wrong while updating the username");
    }
})

const updateUserAvatar = asyncHandler(async (req, res) => {
    try {
        const avatarLocalPath = req.file?.path;
        console.log(`${req}\n${avatarLocalPath}\n${req.file}\n${req.file.avatar}\n\n\n`);
        if (!avatarLocalPath) {
            throw new ApiError(400, "Please upload an image")
        }
        const avatar = await uploadOverCloudinary(avatarLocalPath);
        if (!avatar.url) {
            throw new ApiError(400, "Error while uploading on avatar");
        }
        const urlToDelete = req.user[0]?.avatar;
        console.log(req.user);
        console.log(urlToDelete);
        const user = await User.findByIdAndUpdate(
            req.user[0]?._id,
            {
                $set:
                {
                    avatar: avatar.url
                }
            },
            {
                new: true
            }
        ).select("-password");
        await deleteFromCloudinary(urlToDelete)

        return res.status(200).json(new ApiResponse(200, user, "Avatar updated successfully"));
    } catch (error) {
        throw new ApiError(500, error?.message || "Something went wrong while updating the avatar");
    }


})

const updateUserCoverImage = asyncHandler(async (req, res) => {
    try {
        const coverImageLocalPath = req.files?.path;
        if (!coverImageLocalPath) {
            throw new ApiError(400, "Please upload an image")
        }
        const coverImage = await uploadOverCloudinary(coverImageLocalPath);
        if (!coverImage.url) {
            throw new ApiError(400, "Error while uploading on cover Image");
        }
        const urlToDelete = user.coverImage
        const user = await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set:
                {
                    coverImage: coverImage.url
                }
            },
            {
                new: true
            }
        ).select("-password");
        await deleteFromCloudinary(urlToDelete)
        return res.status(200).json(new ApiResponse(200, user, "cover image updated successfully"));
    } catch (error) {
        throw new ApiError(500, error?.message || "Something went wrong while updating the cover Image");
    }


})
const getUserChannelProfile = asyncHandler(async (req, res) => {
    try {
        const { username } = req.params;
        if (!username?.trim(0)) throw new ApiError(400, "username is not  provided")
        const channel = await User.aggregate([
            {
                $match: {
                    username: username?.toLowerCase()
                }
            },
            {
                $lookup: {
                    from: "subscriptions",
                    localField: "_id",
                    foreignField: "channel",
                    as: "subscribers"
                }
            },
            {
                $lookup: {
                    from: "subscriptions",
                    localField: "_id",
                    foreignField: "subscriber",
                    as: "subscribedTo"
                }
            },
            {
                $addFields: {
                    subscribersCount: { $size: "$subscribers" },
                    subscribedToCount: { $size: "$subscribedTo" },
                    isSubscribed: {
                        $cond:
                        {
                            if:
                            {
                                $in: [req.user?._id, "$subscribers.subscriber"]
                            }
                            , then: true,
                            else: false
                        }
                    }

                }
            },
            {
                $project: {
                    fullName: 1,
                    username: 1,
                    subscribersCount: 1,
                    subscribedToCount: 1,
                    isSubscribed: 1,
                    avatar: 1,
                    coverImage: 1,
                    email: 1
                }
            }
        ])
        if (!channel?.length) return res.status(404).send("Channel does not exist")
        return res
            .status(200)
            .json(new ApiResponse(200, channel[0], "channel fetched successfully"))


    } catch {
        throw new ApiError(500, error?.message || "Something went wrong while getting the user channel profile")
    }
})

const getUserWatchHistory = asyncHandler(async (req, res) => {
    try {
        // console.log(req);
        console.log(req.user);
        const user = await User.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(req.user[0]?._id)
                }
            },
            {
                $lookup: {
                    from: "videos",
                    localField: "watchHistory",
                    foreignField: "_id",
                    as: "watchHistory",
                    pipeline: [
                        {
                            $lookup: {
                                from: "users",
                                localField: "owner",
                                foreignField: "_id",
                                as: "owner",
                                pipeline: [
                                    {
                                        $project: {
                                            fullName: 1,
                                            username: 1,
                                            avatar: 1
                                        }
                                    }
                                ]
                            }
                        },
                        {
                            $addFields: {
                                owner: {
                                    $first: "$owner"
                                }
                            }

                        }
                    ]
                }
            }
        ])
        console.log(user);
        return res
            .status(200)
            .json(new ApiResponse(
                200,
                user[0].watchHistory,
                "Watch history fetched successfully"
            ))
    } catch (error) {
        throw new ApiError(500, error?.message || "Something went wrong while getting the user channel profile")
    }
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateEmailID,
    updateUsername,
    updateUserCoverImage,
    updateUserAvatar,
    getUserChannelProfile,
    getUserWatchHistory
}