const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const HttpError = require("../models/http-error");

const User = require("../models/user");

const getUserById = async (req, res, next) => {
  // url'den datayı alıyoruz.
  const userId = req.params.uid; // { uid: 'u1' }

  let user;
  try {
    user = await User.findById(userId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find a user.",
      500
    );
    return next(error);
  }

  if (!user) {
    // app.js'deki error middleware'ı tetikler
    throw new HttpError("Could not find a user for the provided id.", 404);
  }

  res.json({ user }); // => { user } => { user: user }
};

const getAllUsers = async (req, res, next) => {
  let users;
  try {
    users = await User.find({}, "-password");
  } catch (err) {
    const error = new HttpError(
      "Fetching users failed, please try again later.",
      500
    );
    return next(error);
  }

  if (!users || users.length === 0) {
    // app.js'deki error middleware'ı tetikler
    return next(new HttpError("Could not find users.", 404));
  }
  res.json({ users: users.map((user) => user.toObject({ getters: true })) });
};

const signup = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // validator.js dokümanına göre bunu da dönebiliriz.
    /* return res.status(422).json({ errors: errors.array() }); */
    throw new HttpError("Invalid user informations!", 422);
  }
  const { name, email, password } = req.body;

  // email'i unique yaparak aynı email ile birden fazla kayıt yapılamasını engelliyoruz.

  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    const error = new HttpError(
      "Signing up failed, please try again later.",
      500
    );
    return next(error);
  }

  if (existingUser) {
    const error = new HttpError(
      "User exists already, please login instead.",
      422
    );
    return next(error);
  }
  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (err) {
    const error = new HttpError(
      "Could not create user, please try again.",
      500
    );
    return next(error);
  }

  const createdUser = new User({
    name,
    email,
    password: hashedPassword,
    image: req.file.path,
    places: [],
  });

  try {
    await createdUser.save();
  } catch (err) {
    const error = new HttpError("Signing up failed, please try again.", 500);
    return next(error);
  }

  // jwt ile token oluşturuyoruz.
  let token;
  try {
    token = jwt.sign(
      { userId: createdUser.id, email: createdUser.email },
      process.env.JWT_KEY,
      { expiresIn: "1h" }
    );
  } catch (err) {
    const error = new HttpError("Signing up failed, please try again.", 500);
    return next(error);
  }

  // createdUser.toObject({ getters: true }) => password'u göstermemek için
  res
    .status(201)
    .json({ userId: createdUser.id, email: createdUser.email, token: token });

  /* res.status(201).json({ user: createdUser.toObject({ getters: true }) }); */
};

const login = async (req, res, next) => {
  const { email, password } = req.body;
  // email'i unique yaparak aynı email ile birden fazla kayıt yapılamasını engelliyoruz.
  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    const error = new HttpError(
      "Logging in failed, please try again later.",
      500
    );
    return next(error);
  }

  if (!existingUser) {
    return next(
      new HttpError(
        "Could not identify user, credentials seem to be wrong.",
        401
      )
    );
  }

  let isValidPassword = false;
  try {
    isValidPassword = await bcrypt.compare(password, existingUser.password);
  } catch (err) {
    const error = new HttpError(
      "Could not log you in, please check your credentials and try again.",
      500
    );
    return next(error);
  }

  if (!isValidPassword) {
    return next(
      new HttpError(
        "Could not identify user, credentials seem to be wrong.",
        403
      )
    );
  }

  // jwt ile token oluşturuyoruz.
  let token;
  try {
    token = jwt.sign(
      { userId: existingUser.id, email: existingUser.email },
      process.env.JWT_KEY,
      { expiresIn: "1h" }
    );
  } catch (err) {
    const error = new HttpError("Logging up failed, please try again.", 500);
    return next(error);
  }

  res.json({
    userId: existingUser.id,
    email: existingUser.email,
    token: token,
  });
};

module.exports = {
  getUserById,
  getAllUsers,
  signup,
  login,
};
