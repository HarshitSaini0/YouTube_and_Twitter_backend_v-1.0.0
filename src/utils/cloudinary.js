import { v2 as cloudinary } from 'cloudinary';
import { log } from 'console';
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


export { uploadOverCloudinary };

