const fs = require("fs");
const { validationResult } = require("express-validator");
const HttpError = require("../models/http-error");
const getCoordsForAddress = require("../util/location");
const Place = require("../models/place");
const User = require("../models/user");
const mongoose = require("mongoose");
const getPlaceById = async (req, res, next) => {
  // Get the data from the url
  const placeId = req.params.pid; // { pid: 'p1' }

  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    console.log(err);
    const error = new HttpError(
      "Something went wrong, could not find a place.",
      500
    );
    return next(error);
  }

  if (!place) {
    const error = new HttpError(
      "Could not find a place for the provided id.",
      404
    );
    // hata varsa patlatıyoruz. aksi halde kod execution devam eder.
    return next(error);
  }

  res.json({ place: place.toObject({ getters: true }) }); // => { place } => { place: place }
};

const getPlacesByUserId = async (req, res, next) => {
  // url'den datayı alıyoruz.
  const userId = req.params.uid; // { uid: 'u1' }
  let places;
  try {
    places = await Place.find({ creator: userId });
  } catch (err) {
    console.log(err);
    const error = new HttpError(
      "Fetching places failed, please try again later.",
      500
    );
    // hata varsa patlatıyoruz. aksi halde kod execution devam eder.
    return next(error);
  }

  if (!places.length) {
    // app.js'deki error middleware'ı tetikler
    return next(
      new HttpError("Could not find places for the provided user id.", 404)
    );
  }
  // id'yi ekliyoruz. id'yi mongodb'den alıyoruz.
  res.json({
    places: places.map((place) => place.toObject({ getters: true })),
  });
};

/* 
**** Aşağısı aynı işi populate ile yapıyor. ****
const getPlacesByUserId = async (req, res, next) => {
  // url'den datayı alıyoruz.
  const userId = req.params.uid; // { uid: 'u1' }
  let userWithPlaces;
  try {
    userWithPlaces = await User.findById(userId).populate("places");
  } catch (err) {
    console.log(err);
    const error = new HttpError(
      "Fetching places failed, please try again later.",
      500
    );
    // hata varsa patlatıyoruz. aksi halde kod execution devam eder.
    return next(error);
  }

  if (!userWithPlaces.places.length) {
    // app.js'deki error middleware'ı tetikler
    return next(
      new HttpError("Could not find places for the provided user id.", 404)
    );
  }
  // id'yi ekliyoruz. id'yi mongodb'den alıyoruz.
  res.json({
    places: userWithPlaces.places.map((place) =>
      place.toObject({ getters: true })
    ),
  });
}; */

const createPlace = async (req, res, next) => {
  // express-validator'dan gelen error'ları yakalıyoruz.
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors);

    // validator.js dokümanına göre bunu da dönebiliriz.
    /* return res.status(422).json({ errors: errors.array() }); */

    // async fonksiyon içindeyiz, bu yüzden next ile error fırlatıyoruz.
    next(new HttpError("Invalid inputs passed, please check your data.", 422));
  }

  const { title, description, address } = req.body;

  // getCoordsForAddress fonksiyonu async olduğu için await ile bekliyoruz.

  let coordinates;
  try {
    coordinates = await getCoordsForAddress(address);
  } catch (error) {
    console.log("error", error.message);
    // async fonksiyon içindeyiz, bu yüzden next ile error fırlatıyoruz
    // next için return kullanıyoruz. otomatik olarak kod okuması next ile durmaz.
    const err = new HttpError(
      "Creating place failed, please try again later.",
      500
    );
    // hata varsa patlatıyoruz. aksi halde kod execution devam eder.
    return next(err);
  }

  const createdPlace = new Place({
    title,
    description,
    address,
    location: coordinates,
    image: req.file.path,
    creator: req.userData.userId,
  });

  // creator id'sini kullanarak user'ı buluyoruz.
  let user;
  try {
    user = await User.findById(req.userData.userId);
  } catch (error) {
    const err = new HttpError(
      "Creating place failed, please try again later.",
      500
    );
    console.log("error", error.message);
    // hata varsa patlatıyoruz. aksi halde kod execution devam eder.
    return next(error);
  }

  // user yoksa hata fırlatıyoruz.
  if (!user) {
    const err = new HttpError("Could not find user for provided id.", 404);
    // hata varsa patlatıyoruz. aksi halde kod execution devam eder.
    return next(err);
  }

  try {
    // buranın çalışması için mongo db'de ilgilim collection önceden oluşturulmalı. Burası için "places".
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdPlace.save({ session: sess });
    // user'ın places array'ine yeni place'i ekliyoruz.
    user.places.push(createdPlace);
    await user.save({ session: sess });
    await sess.commitTransaction();
  } catch (error) {
    console.log("error", error.message);
    // hata varsa patlatıyoruz. aksi halde kod execution devam eder.
    return next(error);
  }

  res.status(201).json({ place: createdPlace });
};

const updatePlace = async (req, res, next) => {
  // express-validator'dan gelen error'ları yakalıyoruz.
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // validator.js dokümanına göre bunu da dönebiliriz.
    /* return res.status(422).json({ errors: errors.array() }); */

    return next(
      new HttpError("Invalid inputs passed, please check your data.", 422)
    );
  }

  const { title, description } = req.body;
  const placeId = req.params.pid; // { pid: 'p1' }

  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not update place.",
      500
    );
    return next(error);
  }

  // place'yi oluşturan user ile token'daki user'ı karşılaştırıyoruz.
  // req.userData checkAuth middleware'dan geliyor.
  if (place.creator.toString() !== req.userData.userId) {
    const error = new HttpError("You are not allowed to edit this place.", 401);
    return next(error);
  }

  if (!place) {
    throw new HttpError("Could not find a place for that id.", 404);
  }

  const oldImagepath = place.image;

  place.title = title;
  place.description = description;
  place.image = req.file.path;

  try {
    await place.save();
    //delete old image from server
    fs.unlink(oldImagepath, (err) => {
      console.log(err);
    });
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not update place.",
      500
    );
    return next(error);
  }

  //delete old image from server

  // mongoose'den gelen _id'yi id'ye çeviriyoruz.
  res.status(200).json({ place: place.toObject({ getters: true }) });
};

const deletePlace = async (req, res, next) => {
  const placeId = req.params.pid; // { pid: 'p1' }

  let place;
  try {
    place = await Place.findById(placeId).populate("creator");
  } catch (err) {
    console.log(err);
    const error = new HttpError(
      "Something went wrong, could not delete place.",
      500
    );
    // hata varsa patlatıyoruz. aksi halde kod execution devam eder.
    return next(error);
  }

  // place'yi oluşturan user ile token'daki user'ı karşılaştırıyoruz.
  // req.userData checkAuth middleware'dan geliyor.
  if (place.creator.id !== req.userData.userId) {
    const error = new HttpError(
      "You are not allowed to delete this place.",
      401
    );
    return next(error);
  }

  if (!place) {
    const error = new HttpError("Could not find place for this id.", 404);
    // hata varsa patlatıyoruz. aksi halde kod execution devam eder.
    return next(error);
  }

  const imagePath = place.image;

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    // ilgili session'da ilgili place'in silme işlemini gerçekleştiriyoruz.
    await place.deleteOne({ session: sess });
    // populate ile creator'ın tüm bilgilerini place'e eklemiştik.
    // populate sayesinde user'ın places array'inden silinen place'i çıkarıyoruz.
    place.creator.places.pull(place);
    // aslında user'ın son halini kayıt ediyoruz.
    await place.creator.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    console.log(err);
    const error = new HttpError(
      "Something went wrong, could not delete place.",
      500
    );
    // hata varsa patlatıyoruz. aksi halde kod execution devam eder.
    return next(error);
  }

  //delete image from server

  fs.unlink(imagePath, (err) => {
    console.log(err);
  });

  res.status(200).json({ message: "Deleted place." });
};

module.exports = {
  getPlaceById,
  getPlacesByUserId,
  createPlace,
  updatePlace,
  deletePlace,
};
