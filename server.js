const express = require('express');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('@exortek/express-mongo-sanitize');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { xss } = require('express-xss-sanitizer');
const hpp = require('hpp');
const cors = require('cors');
const swaggerUI = require('swagger-ui-express');

const companies = require('./routes/companies');
const auth = require('./routes/auth');
const bookings = require('./routes/bookings');
const reviews = require('./routes/reviews');
const blogs = require('./routes/blogs');
const comments = require('./routes/comments');
const connectDB = require('./config/db');
const buildSwaggerDocument = require('./docs/swagger');

dotenv.config({ path: './config/config.env' });

connectDB();

const app = express();

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, 
  max: 1000 
});

const swaggerDocument = buildSwaggerDocument();
const swaggerUiOptions = {
  explorer: true,
  swaggerOptions: {
    url: '/api-docs/swagger.json',
  },
};
const swaggerUiHandler = swaggerUI.setup(null, swaggerUiOptions);

app.get(/^\/api-docs$/, (req, res) => {
  res.redirect('/api-docs/');
});
app.get('/api-docs/swagger.json', (req, res) => {
  res.json(swaggerDocument);
});
app.use('/api-docs', swaggerUI.serveFiles(null, swaggerUiOptions));
app.get('/api-docs/', swaggerUiHandler);

app.use(express.json());
app.use(helmet());
app.use(xss());
app.use(limiter);
app.use(hpp());
app.use(cors());
app.use(cookieParser());
app.set('query parser', 'extended');

app.use('/api/v1/companies', companies);
app.use('/api/v1/auth', auth);
app.use('/api/v1/bookings', bookings);
app.use('/api/v1/reviews', reviews);
app.use('/api/v1/blogs', blogs);
app.use('/api/v1/comments', comments);

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  const server = app.listen(PORT, () => {
    console.log(`Server is running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  });

  process.on('unhandledRejection', (err, promise) => {
    console.log(`Error: ${err.message}`);
    server.close(() => process.exit(1));
  });
}


module.exports = app;