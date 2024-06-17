import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/apiError.js'
import { User } from '../models/user.model'
import { uploadOverCloudinary } from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/apiResponse.js'

const registerUser = asyncHandler(async (req, res) => {
    const { username, email, password, fullName } = req.body;
    // mea validation baad me dalu ga 

    // throw error
    if ([email, password, fullName, username].some((fields) => fields?.trim() === "")) {
        throw new ApiError(400,"All fields are required!!!");
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
    const coverImageLocalPath = req.files?.coverImage[0]?.path;
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

    if(!createdUser){
        throw new ApiError(500,"Something went wrong while registering the user")
    }


    return res.status(201).json(
        new ApiResponse(201,createdUser,"User registered successfully")
    )
    // const user = await User.create({
    //     username,email,password,fullName
    //     })





})
export { registerUser }