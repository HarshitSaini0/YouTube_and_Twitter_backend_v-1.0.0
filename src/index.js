import { app } from './app.js';
import dotenv from 'dotenv'
import connectDB from "./db/connect.db.js";

dotenv.config({
    path: './env'
})

connectDB()
    .then(() => {
        try {
            
            app.on("error", (error) => {
                console.log("Error : ", error)
                throw error;
            })
            app.listen(process.env.PORT,()=>{
                console.log(`Listing at port http://localhost:${process.env.PORT}`);
            })
        } catch (error) {
            console.log("Error", error.message)
        }
    }

    )
    .catch((error) => {
        console.log('Mongo DB connection failed to connect', error)
    })

/*
import express from 'express';
const app = express();

(async () => {
    try {
        await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`)
        app.on("error", (error) => {
            console.log("Error : ", error)
            throw error;
        })
        app.listen(process.env.PORT,()=>{
            console.log(`Listing at port http://localhost:${process.env.PORT}`);
        })
    } catch (error) {
        console.log("Error", error.message)
    }
})()
*/