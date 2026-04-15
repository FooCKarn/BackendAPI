
const Blog = require('../models/Blog.js');

exports.addBlog = async (req, res, next) => {
  try {

    req.body.author = req.user.id;

    if(typeof req.body.title === "undefined" 
      || typeof req.body.content === "undefined")return res.status(400).json(
        {
          success: false, 
          message: "Please enter Title and Content"
        });
    if(req.body.title.toString().length > 50)return res.status(400).json(
        {
          success: false, 
          message: "Character limit exceeded at title"
        });
    if(req.body.content.toString().length > 50)return res.status(400).json(
        {
          success: false, 
          message: "Character limit exceeded at content"
        });
    let blog = await Blog.create(req.body);
    return res.status(201).json({ success: true, data: blog });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};