
stotte-api
Node.js, Express and MongodB

Dev Link (Domain): https://api.stotte.com
Dev Link (AWS Link): http://stotte.eu-north-1.elasticbeanstalk.com

## What will you learn ?
What will you learn by downloading my code?
- Use of **express** to make API creation simple
- Using **mongoose** to manage communication with Mongo DB
- Image Upload with **multer**
- Image deletion with the notions of paths and file system in node
- Field validation using **express-validator**
- Creation of reusable methods thanks to the concept of **modules**
- Creation of a functional REST API with Node.js, Express and Mongo DB.

Are you ready ? Let's go

## Step 1: Installing dependencies
Clone the repository then run **npm install**

## Step 2: Link your api to Mongo DB
You can install mongodb locally or use Mongo Atlas (online). In both cases, go to the **app.js** file then replace the url **mongodb://localhost:27017/stotte-app** with your url. In my case I use Mongo DB locally. It is therefore available on port **27017**(by default) and the name of my database is **stotte-app**.

## Step 3: Launch your project
To launch your project, just type the following command : **node app.js**. Your API will therefore run on port 8002

