import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/apiError.js'
import { User } from '../models/user.model.js'
import { uploadOverCloudinary } from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/apiResponse.js'
import jwt from 'jsonwebtoken'

const generateAccessAndRefreshToken = async (userID) => {
    try {
        const user = await User.findById(userID);
        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();
        user.refreshToken = refreshToken;
        await user.save({ ValidateBeforeSave: false });
        return { refreshToken, accessToken }
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
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);
    const loggedInUser = await User.findById(user._id).select('-password -refreshToken')
    const options = {
        httpOnly: true,
        secure: true,

    }
    res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(
            200,
            {
                user: loggedInUser
                , accessToken
                , refreshToken
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
            $set: {
                refreshToken: undefined
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
        const { newRefreshToken, accessToken } = await generateAccessAndRefreshToken(user._id);
        return res
            .status(200)
            .cookie("refreshToken", newRefreshToken, options)
            .cookie("accessToken", accessToken, options)
            .json(new ApiResponse(201,
                { 
                    accessToken, refreshToken: newRefreshToken 
                },
                "Access token Refreshed"
            ))
    } catch (error) {
        throw new ApiError(500,error?.message||"Something went wrong while refreshing the token")
    }

})


export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
}