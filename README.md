# sample-nodejs-api
Base Structure for a NodeJS Typescript Express API application

The application is written in TypeScript.

## Setting up environment for local development and running

Some initial set up is needed to run these applications. These instructions were written for OSX, but the steps should
be similar for Windows users.

First, we need to install node.

### Install Node on Mac

Open your Terminal and enter the following to update Homebrew to see the latest versions:

`brew update`

Then, we install node itself:

`brew install node`

### Install Node on Windows

Open your Browser and navigate to https://nodejs.org/en/download/ . 

### Prepare Repo

Navigate to your clone of the repo.

Update to latest code with `git pull`

### Install Node Modules for the project

Run `npm install`

### Install Postgresql for the database

Download the setup for your OS - https://www.postgresql.org/download/ and install it

Update database configurations in config/db_config.ts with your database credentials

Create a sample table - 

`
CREATE TABLE account(
   user_id serial PRIMARY KEY,
   username VARCHAR (50) UNIQUE NOT NULL,
   password VARCHAR (50) NOT NULL,
   email VARCHAR (355) UNIQUE NOT NULL,
   created_on TIMESTAMP NOT NULL,
   last_login TIMESTAMP
);
`

Insert 2 sample rows of data

`
INSERT INTO account values (default, 'username1', 'password1', 'email1@emaildomain.com', current_timestamp, null);
INSERT INTO account values (default, 'username2', 'password2', 'email2@emaildomain.com', current_timestamp, null);
`

### Running the backend

Run `nodemon` in the terminal to start the server
