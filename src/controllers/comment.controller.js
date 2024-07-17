import mongoose from "mongoose"
import { Comment } from "../models/comment.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"

const getVideoComments = asyncHandler(async (req, res) => {
    try {
        const { page = 1, limit = 4 } = req.query;
        const { videoId } = req.params;

        const videoObjectId = new mongoose.Types.ObjectId(videoId);

        const commentsAggregation = await Video.aggregate([
            { $match: { _id: videoObjectId } },
            {
                $lookup: {
                    from: 'comments',
                    localField: '_id',
                    foreignField: 'video',
                    as: 'comments'
                }
            },
            { $unwind: '$comments' },
            {
                $facet: {
                    total: [{ $count: 'count' }],
                    paginatedResults: [
                        { $sort: { 'comments.createdAt': -1 } },
                        { $skip: (page - 1) * limit },
                        { $limit: limit },
                        {
                            $project: {
                                'comments._id': 1,
                                'comments.comment': 1,
                            }
                        }
                    ]
                }
            },
            {
                $project: {
                    totalComments: { $arrayElemAt: ['$total.count', 0] },
                    comments: '$paginatedResults'
                }
            }
        ]);

        if (commentsAggregation.length > 0) {
            const { totalComments, comments } = commentsAggregation[0];
            return res.status(200).json(new ApiResponse(200, { totalComments, comments }, 'Fetched all comments successfully'));
        } else {
            throw new ApiError(404, 'Video not found');
        }
    } catch (error) {
        throw new ApiError(500, error.message || 'Something went wrong while fetching the comments');
    }
})

const addComment = asyncHandler(async (req, res) => {
    try {
        const { comment } = req.body;
        const { videoId } = req.params;
        const { userId } = req.user[0]._id;
        const commentPosted = await Comment.create({
            comment,
            video: videoId,
            owner: userId
        })
        if (!commentPosted) {
            throw new ApiError(500, "Unable to post your comment");
        }
        return res.status(200).json(new ApiResponse(200, commentPosted, "comment successful"))

    } catch (error) {
        throw new ApiError(500, error?.message || "Something went wrong while adding comment")
    }

})

const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { newComment } = req.body;
    const newCommentAfterUpdate = await Comment.findByIdAndUpdate(
        commentId,
        {
            $set: {
                comment: { $cond: [{ $eq: ["$owner", req.user._id] }, newComment, "$$comment"] }
            }
        },
        { new: true }
    )
    if (!newCommentAfterUpdate) {
        throw new ApiError(500, "comment vanished, do not know why")
    }
    return res
        .status(200)
        .json(new ApiResponse(200, newCommentAfterUpdate, "Updated comment successfully"))

})

const deleteComment = asyncHandler(async (req, res) => {
    try {
        const { commentId } = req.params;
        await Comment.findByIdAndDelete(commentId, { new: true })
            .then(deleteDoc => {
                if (!deleteDoc) {
                    throw new ApiError(404, "comment not found")
                }
                return res
                    .status(200)
                    .json(new ApiResponse(
                        200,
                        {
                            commentId
                        },
                        "comment deleted successfully"
                    ))
            })
            .catch(err => {
                throw new ApiError(500, err?.message || "Something while waiting of completion of delete process of comment")
            });
    } catch (error) {
        throw new ApiError(500, error?.message || "Something went wrong while trying to delete the post")

    }
})

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}