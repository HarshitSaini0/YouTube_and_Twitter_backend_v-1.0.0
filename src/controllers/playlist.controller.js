import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { Playlist } from "../models/playlist.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"


const createPlaylist = asyncHandler(async (req, res) => {
    try {
        const { name, description } = req.body;
        if(name&&description){
            throw new ApiError(400,"name and description is important")
        }
        const owner = req.user[0]._id;
        const playlist = await Playlist.create(
            {
                name,
                description,
                owner,
            }
        )
        return res
            .status(200)
            .json(new ApiResponse(201, playlist, "Playlist created successfully"));
    } catch (error) {
        throw new ApiError(500, error?.message || "Something went wrong  while trying to create the playlist")
    }

    //TODO: create playlist
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    try {
        const { userId } = req.params
        const getUserPlaylists = await Playlist.find({ owner: userId })
        return res
            .status(200)
            .json(new ApiResponse(200, getUserPlaylists, "User playlists retrieved successfully"));

    } catch (error) {
        throw new ApiError(500, error?.message || "Something went wrong  while trying to fetch playlist of a user")

    }
})

const getPlaylistById = asyncHandler(async (req, res) => {
    try {
        const { playlistId } = req.params
        const playlist = await Playlist.findById(playlistId);
        return res
            .status(200)
            .json(new ApiResponse(200, playlist, "Playlist retrieved successfully"));
    } catch (error) {
        throw new ApiError(500, error?.message || "Something went wrong  while trying to fetch a playlist")

    }
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    try {
        const { playlistId, videoId } = req.params

        // Find the playlist
        const playlist = await Playlist.findById(playlistId);
        if (!playlist) {
            throw new ApiError(404, "Playlist not found")
        }

        // Find the video
        const video = await Video.findById(videoId);
        if (!video) {
            throw new ApiError(404, "Video not found")
        }

        // Check if video already exists in the playlist
        if (playlist.videos.includes(videoId)) {
            res
                .status(400)
                .json(new ApiResponse(400, { playlistId, videoId }, "Video already exists in the playlist"))
        }

        // Add the video to the playlist
        playlist.videos.push(videoId);
        await playlist.save();

        res
            .status(200)
            .json(
                new ApiResponse(200, { playlistId, videoId }, "Video added to the playlist successfully")
            );
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {

    // TODO: remove video from playlist
    try {
        const { playlistId, videoId } = req.params;

        // Find the playlist
        const playlistAndVideo = await Playlist.find({
            _id: playlistId,
            videos: videoId
        });
        if (!playlistAndVideo) {
            throw new ApiError(404, "Playlist may not contains the video or maybe playlist does not exist")
        }
        const playlist = await Playlist.findById(playlistId);
        // Check if video exists in the playlist
        const videoIndex = playlist.videos.indexOf(videoId);
        if (videoIndex === -1) {
            throw new ApiError(404, "Video not found in the playlist")
        }

        // Remove the video from the playlist
        playlist.videos.splice(videoIndex, 1);
        await playlist.save();

        res
            .status(200)
            .json(
                new ApiResponse(200, { playlistId, videoId }, "Video removed from the playlist successfully"))

    } catch (error) {
        throw new ApiError(500, error?.message || "Something went wrong while deleting the video from playlist")
    }

})

const deletePlaylist = asyncHandler(async (req, res) => {
    // TODO: delete playlist
    try {
        const { playlistId } = req.params
        const playlist = await Playlist.findByIdAndDelete(playlistId);
        if (!playlist) {
            throw new ApiError(404, "There is some issue from DB side maybe playlist not found or may be issue while deleting the playlist ")
        }
        res
            .status(200)
            .json(
                new ApiResponse(200, { playlistId }, "Playlist deleted successfully")
            )
    } catch (error) {
        throw new ApiError(500, error?.message || "Something went wrong while deleting the playlist")
    }
})

const updatePlaylist = asyncHandler(async (req, res) => {
    try {
        const { playlistId } = req.params
        const { name, description } = req.body
        if(name&&description){
            throw new ApiError(400,"name and description is important")
        }
        const playlist = await Playlist.findByIdAndUpdate(playlistId, { name, description }, { new: true
            });
            if (!playlist) {
                throw new ApiError(404, "There is some issue from DB side maybe playlist not found or may be issue while updating the playlist ")
                }
                res
                .status(200)
                .json(
                    new ApiResponse(200, { playlistId }, "Playlist updated successfully")
                    )

    } catch (error) {
        throw new ApiError(500, error?.message || "Something went wrong while updating the playlist")
        
    }

    //TODO: update playlist
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}