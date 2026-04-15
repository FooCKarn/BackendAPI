const Comment = require('../models/Comment.js');

exports.addComment = async (req, res, next) => {
  try {

    req.body.blog = req.params.id;
    req.body.author = req.user.id;
    if(typeof req.body.blog === "undefined" 
      || typeof req.body.author === "undefined")return res.status(400).json(
        {
          success: false, 
          message: "Please enter Blog and Author"
        });

    if(typeof req.body.text === "undefined" )
      return res.status(400).json(
        {
          success: false, 
          message: "Please enter text"
        });
    if(req.body.text.toString().length>100)return res.status(400).json(
        {
          success: false, 
          message: "Character limit exceeded"
        }
      );
      
    let comment = await Comment.create(req.body);
    return res.status(201).json({ success: true, data: comment });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};