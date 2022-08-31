const path = require('path');
const fs = require('fs');

const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const mongoDBStore = require('connect-mongodb-session')(session);
const csrf = require('csurf');
const flash = require('connect-flash');
const multer = require('multer');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');
const errorController = require('./controllers/error');

const User = require('./models/user');

const mongoDB_URI = `mongodb+srv://${process.env.mongoDB_user}:${process.env.mongoDB_password}@cluster0.z1k4tpp.mongodb.net/${process.env.mongoDB_database}`

const app = express();
const store = new mongoDBStore({
    uri: mongoDB_URI,
    collection: 'sessions',
});

const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'images');
    },
    filename: (req, file, cb) => {
        cb(null, new Date().getTime() + '-' + file.originalname);
    }
})

const fileFilter = (req, file, cb) => {
    if(file.mimetype === 'image/png' || file.mimetype === 'image/jpg' || file.mimetype === 'image/jpeg'){
        cb(null, true);
    }
    else{
        cb(null, false);
    }
    
}

const accessLogStream = fs.createWriteStream(
    path.join(__dirname, 'access.log'),
    {flags: 'a'}//append,不會覆蓋
)

app.set('view engine', 'ejs');
app.set('views', 'views')

app.use(helmet.contentSecurityPolicy({
        directives: {
            'default-src': ["'self'"],
            'script-src-attr': ["'self'", "'unsafe-inline'"],
        },
    })
)
app.use(compression())
app.use(morgan('combine', {stream: accessLogStream}));

app.use(express.urlencoded({ extended: true }));//用來parse req.body
app.use(multer({storage: fileStorage, fileFilter: fileFilter}).single('image'));
app.use(express.static(path.join(__dirname, 'public')));//讓public裡的檔案可以作用
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use(session({
    secret: 'longString',
    resave: false,
    saveUninitialized: false,
    store: store,
}));
app.use(csrf());
app.use(flash());

app.use((req, res, next) => {
    res.locals.isAuthenticated = req.session.isLoggedIn;
    res.locals.csrfToken = req.csrfToken();
    next();
});

app.use((req, res, next) => {
    if(!req.session.user){
        return next();
    };
    User.findById(req.session.user._id)
    .then((user) => {
        if(!user){
            return next();
        };
        req.user = user;
        next();
    })
    .catch((err) => {
        next(new Error(err));
    });
});

app.use('/admin',adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

app.get('/500', errorController.get500);

app.use(errorController.get404);

app.use((error, req, res, next) => {
    res.status(500).render('500', {
        pageTitle: '500',
        path: '/500',
    });
})

mongoose
.connect(mongoDB_URI)
.then((result) => {
    app.listen(process.env.PORT || 3000);
})
.catch((err) => {
    console.log(err);
})