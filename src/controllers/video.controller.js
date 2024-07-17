import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadOverCloudinary, deleteFromCloudinary, deleteVideoFromCloudinary } from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    // const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
    const { page = 1, limit = 4, query, sortBy = 'createdAt', sortType = 'desc', userId } = req.query;

    // Convert page and limit to integers
    const pageInt = parseInt(page, 10);
    const limitInt = parseInt(limit, 10);

    // Build the query object
    const searchQuery = query ? { title: new RegExp(query, 'i') } : {};
    if (userId) {
        searchQuery.owner = userId;
    }

    // Sorting options
    const sortOptions = {};
    sortOptions[sortBy] = sortType === 'asc' ? 1 : -1;

    try {
        // Fetch videos with pagination, filtering, and sorting
        const videos = await Video.find(searchQuery)
            .sort(sortOptions)
            .skip((pageInt - 1) * limitInt)
            .limit(limitInt);

        // Get total count of videos for pagination
        const totalVideos = await Video.countDocuments(searchQuery);

        res.status(200).json(new ApiResponse(200, {
            success: true,
            data: videos,
            totalPages: Math.ceil(totalVideos / limitInt),
            currentPage: pageInt,
            totalVideos
        }, "Videos fetched successfully"));
    } catch (error) {
        throw new ApiError(500, error?.message || "Something went wrong while fetching the videos for db side")
    }


})

const publishAVideo = asyncHandler(async (req, res) => {
    try {
        const { title, description } = req.body;

        const userID = req.user[0]._id;

        const videoLocalPath = req.files?.videoFile[0]?.path;
        const thumbnailLocalPath = req.files?.thumbnail[0]?.path;

        if (!(videoLocalPath && thumbnailLocalPath)) {
            throw new ApiError(400, "Please upload a video and thumbnail")
        }

        console.log(videoLocalPath);

        const videoOnCloudinary = await uploadOverCloudinary(videoLocalPath)

        const thumbnailOnCloudinary = await uploadOverCloudinary(thumbnailLocalPath)

        // console.log(videoOnCloudinary);
        // console.log(req.files);

        if (!(videoOnCloudinary && thumbnailOnCloudinary)) {
            throw new ApiError(500, "Something went wrong while uploading files on cloudinary")
        }

        const uploadedVideo = await Video.create({
            videoFile: videoOnCloudinary.url,
            thumbnail: thumbnailOnCloudinary.url,
            title,
            description,
            owner: userID,
            duration: videoOnCloudinary.duration
        })

        if (!uploadOverCloudinary) {
            throw new ApiError(500, "Something went wrong while creating the video in the database")
        }

        return res
            .status(200)
            .json(new ApiResponse(
                200,
                uploadedVideo,
                "Video created successfully"
            ))
    } catch (error) {
        throw new ApiError(500, error?.message || "Something went wrong while trying to create video")
    }

})

const getVideoById = asyncHandler(async (req, res) => {
    try {
        const { videoId } = req.params
        console.log(req.query);
        const video = await Video.findOne({ _id: videoId })
        if (!video) {
            throw new ApiError(404, "Video not found")
        }
        return res
            .status(200)
            .json(new ApiResponse(
                200,
                video,
                "Video found successfully"
            ))
    } catch (error) {
        throw new ApiError(500, error?.message || "Something went wrong while trying to get video")

    }

})

const updateVideo = asyncHandler(async (req, res) => {
    //Need to be tested !!! done all set 
    try {
        const { videoId } = req.params
        const { title, description } = req.body;
        if (!(title && description)) {
            throw new ApiError(400, "Please provide title and description")
        }

        let updatedVideo;
        const thumbnailLocalPath = req.file?.path;
        if (thumbnailLocalPath) {
            const thumbnailUploadedOnCloudinary = await uploadOverCloudinary(thumbnailLocalPath);
            if (!thumbnailUploadedOnCloudinary) {
                throw new ApiError(500, "Something went wrong while updating thumbnail on cloudinary")
            }
            updatedVideo = await Video.findOneAndUpdate(
                {
                    _id: videoId,
                    owner: req.user[0]._id
                },
                {
                    title,
                    description
                },
                {
                    new: true,
                    projection: { thumbnail: 1 }
                }

            )
            await deleteFromCloudinary(updatedVideo.thumbnail);
            updatedVideo.thumbnail = thumbnailUploadedOnCloudinary.url;

        }
        else {
            updatedVideo = await Video.findOneAndUpdate(
                {
                    _id: videoId,
                    owner: req.user[0]._id
                },
                {
                    title,
                    description
                },
                {
                    new: true,
                }

            )
        }
        if (!updatedVideo) {
            throw new ApiError(400, "Something went wrong while updating video from DB side")
        }
        return res
            .status(200)
            .json(new ApiResponse(
                200,
                updatedVideo,
                "Video updated successfully"
            ))
    } catch (error) {
        throw new ApiError(500, error?.message || "Something went wrong while trying to update video")

    }

})

const deleteVideo = asyncHandler(async (req, res) => {
    try {
        const { videoId } = req.params
        const deletedVideo = await Video.findOneAndDelete(
            {
                _id: videoId,
                owner: req.user[0]._id
            },
            {
                new: true
            }
        )
        console.log(deletedVideo);
        if (!deletedVideo) {
            throw new ApiError(400, "Something went wrong while deleting video from DB side")
        }
        console.log(deletedVideo.videoFile);
        await deleteVideoFromCloudinary(deletedVideo.videoFile);

        return res
            .status(200)
            .json(new ApiResponse(
                200,
                deletedVideo,
                "Video deleted successfully"
            ))
    } catch (error) {
        throw new ApiError(500, error?.message || "Something went wrong while trying to delete video")
    }

})

const togglePublishStatus = asyncHandler(async (req, res) => {
    try {
        const { videoId } = req.params
        // isPublished
        const updatedVideo = await Video.findOneAndUpdate(
            {
                _id: videoId,
                owner: req.user[0]._id
            },
            {
                $set: {
                    isPublished: !req.body.isPublished
                }
            },
            {
                new: true
            }
        )
        if (!updatedVideo) {
            throw new ApiError(400, "Something went wrong while updating video from DB side")
        }
        return res
            .status(200)
            .json(new ApiResponse(
                200,
                updatedVideo,
                "Video updated successfully"
            ))
    } catch (error) {
        throw new ApiError(500, error?.message || "Something went wrong while trying to update video")
    }
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}