import mongoose, { isValidObjectId } from "mongoose"
import { Like } from "../models/like.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    try {
        const { videoId } = req.params
        const { userId } = req.user[0]._id;
        if (!isValidObjectId(videoId)) {
            throw new ApiError("Invalid video id", 400)
        }
        const video = await Like.findOne({
             video: videoId, likedBy: userId 
            })
        if (video) {
            const deletedLike = await Like.deleteOne({
                 video: videoId, likedBy: userId 
                })
            return new ApiResponse(200, deletedLike, "Video like deleted")
        }
        const newLike = await Like.create({
             video: videoId, likedBy: userId 
            })
        return new ApiResponse(200, newLike, "Video like added")
    } catch (error) {
        throw new ApiError(500, error?.message || "Something went wrong while toggling the like of video")

    }
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    try {
        const { commentId } = req.params
        const { userId } = req.user[0]._id;
        if (!isValidObjectId(commentId)) {
            throw new ApiError("Invalid video id", 400)
        }
        const video = await Like.findOne({
             comment: commentId, likedBy: userId 

        })
        if (video) {
            const deletedLike = await Like.deleteOne({
                 comment: commentId, likedBy: userId   
            })
            return new ApiResponse(200, deletedLike, "Video like deleted")
        }
        const newLike = await Like.create({
             comment: commentId, likedBy: userId 

        })
        return new ApiResponse(200, newLike, "Video like added")
    } catch (error) {
        throw new ApiError(500, error?.message || "Something went wrong while toggling the like of comment")

    }

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    try {
        const { tweetId } = req.params
        const { userId } = req.user[0]._id;
        if (!isValidObjectId(tweetId)) {
            throw new ApiError("Invalid video id", 400)
        }
        const video = await Like.findOne({ tweet: tweetId, likedBy: userId })
        if (video) {
            const deletedLike = await Like.deleteOne({ tweet: tweetId, likedBy: userId })
            return new ApiResponse(200, deletedLike, "Video like deleted")
        }
        const newLike = await Like.create({ tweet: tweetId, likedBy: userId })
        return new ApiResponse(200, newLike, "Video like added")
    } catch (error) {
        throw new ApiError(500, error?.message || "Something went wrong while toggling the like of tweet")

    }
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
    const { userId } = req.user[0]._id;
    // const likedVideos = await Like.find({ likedBy: userId }).populate("video")
    const likedVideos = await Like.aggregate([
        { 
            $match: {
                likedBy: userId 
            } 
        },
        {
            $lookup: {
                from: "videos", localField: "video", foreignField: '_id',
                as: "video"
            }
        },
        { 
            $unwind: "$video" 
        },
        { 
            $project: { 
                video: 1 
            }
         }

    ])

    return res.status(200).json(new ApiResponse(200, likedVideos, "Fetch all liked videos"))
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}