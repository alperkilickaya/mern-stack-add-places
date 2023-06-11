const fs = require("fs");
const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

const placesRoutes = require("./routes/places-routes");
const usersRoutes = require("./routes/users-routes");
const HttpError = require("./models/http-error");

const app = express();

// body-parser middleware'ı. otomatik olarak request body'deki datayı alıp json formatına çeviriyor.
app.use(bodyParser.json());

// static dosyaları servis etmek için
app.use("/uploads/images", express.static(path.join("uploads", "images")));

// CORS hatasını çözmek için
app.use((req, res, next) => {
  // tüm domainlere izin veriyoruz.
  res.setHeader("Access-Control-Allow-Origin", "*");
  // hangi methodlara izin veriyoruz.
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  // hangi methodları kullanabiliriz.
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE");

  next();
});

app.use("/api/places", placesRoutes);
app.use("/api/users", usersRoutes);

// diğer middleware'lar çalışmadıysa, bu middleware'a düşer.
// bu middleware'da 404 hatası oluşturuyoruz.
app.use((req, res, next) => {
  const error = new HttpError("Could not find this route.", 404);
  throw error;
});

// bunun öncesinde olmayan bir route haricinde bir error oluşursa, bu middleware'a düşer
// burası backend için global bir hata yönetimi.
app.use((error, req, res, next) => {
  // multer request'e file ekler. burası global hata denetimi. eğer hata varsa ve request'te file varsa, file'ı siler. hata varken bu dosyayı kaydetmek istemeyiz.
  if (req.file) {
    fs.unlink(req.file.path, (err) => {
      console.log(err);
    });
  }

  if (res.headerSent) {
    return next(error);
  }
  res.status(error.code || 500);
  res.json({ message: error.message || "An unknown error occurred!" });
});

mongoose
  .connect(
    `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.yps2fix.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`
  )
  .then(() => {
    const port = 4000;
    app.listen(port, () => `Server running on port ${port}`);
  })
  .catch((err) => {
    console.log("error");
  });
