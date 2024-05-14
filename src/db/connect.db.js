import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";




const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`)
        console.log(`\nMONGO_DB connected : ${connectionInstance.connection.host}`);
        // console.log(connectionInstance);
    } catch (error) {
        console.log("Failed to connect to DB ", error);
        throw error
    }
}

export default connectDB;


