import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs'





// Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET // Click 'View Credentials' below to copy your API secret
});


const uploadOverCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;
        //upload to cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            folder: 'project001',
            resource_type: 'auto'
        })
        // console.log(response);
        //file uploaded successfully
        fs.unlinkSync(localFilePath);
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath) // remove temporary saved file from server
        return null;
    }
}



const deleteFromCloudinary = async (imageUrl) => {
    // Extract public ID from the URL
    const urlParts = imageUrl.split('/');
    const publicId = urlParts[urlParts.length - 1].split('.')[0];

    await cloudinary.api
        .delete_resources([publicId],
            { type: 'upload', resource_type: 'image' })
        .then(console.log);
}
const deleteVideoFromCloudinary = async (imageUrl) => {
    // Extract public ID from the URL
    const urlParts = imageUrl.split('/');
    const publicId = urlParts[urlParts.length - 1].split('.')[0];

    await cloudinary.api
        .delete_resources([publicId], { type: 'upload', resource_type: 'video' })
        .then(console.log)
        .catch(error => console.error('Error deleting resource:', error)); // Handle errors
};



export { uploadOverCloudinary, deleteFromCloudinary,deleteVideoFromCloudinary };

