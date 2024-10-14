const baseConfig = require('./config/base.config');
const path = require('path');
const express = require('express')
const cors = require('cors');
const logger = require('./errorHandler/logger');
const error = require('./errorHandler/errorHandler')
const http = require('http'); //socket
const { Server } = require('socket.io'); //socket
const session = require('express-session');
const bodyParser = require('body-parser');
// const passport = require('./config/passport');

const app = express();
const server = http.createServer(app); //socket

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
}); //socket

const urlApi = "/api";

global.io = io;

app.use(cors());

app.use(session({
    secret: '4rN=EeE(YS30Paf',
    resave: false,
    saveUninitialized: true
}));

let savedPushTokens = [];
app.use(bodyParser.json());

// app.use(passport.initialize());
// app.use(passport.session());


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//memanggil route pada routes\api.route.js
require('./routes/api.route')(app, urlApi);

app.use((err, req, res, next) => {
    logger.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
    res.status(err.status || 500).json({ error: err.message });
});

app.use(error)

app.use('/static', express.static('public'))



//listen
app.listen(process.env.PORT, () => {
    console.log(`server is running on port ${process.env.PORT} and url ${baseConfig.base_url}`);
});
