import React, { useRef, useState, useEffect } from "react";

import Button from "./Button";
import "./ImageUpload.css";

const ImageUpload = (props) => {
  const [file, setFile] = useState();
  const [previewUrl, setPreviewUrl] = useState();
  const [isValid, setIsValid] = useState(false);
  const filePickerRef = useRef();

  //file durumu her değiştiğinde previewUrl state'ini oluşturuyoruz.
  //bunun için FileReader() browser apisini kullanıyoruz.
  useEffect(() => {
    if (!file) {
      return;
    }

    const fileReader = new FileReader();
    // dosya seçildiğinde fileReader'ın result property'si setPreviewUrl() ile set ediliyor.
    fileReader.onload = () => {
      setPreviewUrl(fileReader.result);
    };

    fileReader.readAsDataURL(file);
  }, [file]);

  // pc'den dosya seçimi yapılınca bu çalışır.
  const pickedHandler = (event) => {
    let pickedFile;
    let fileIsValid = isValid;

    if (event.target.files && event.target.files.length === 1) {
      pickedFile = event.target.files[0];
      setFile(pickedFile);
      setIsValid(true);
      fileIsValid = true;
    } else {
      setIsValid(false);
      fileIsValid = false;
    }

    //aşağıda fileIsvalid yerine isValid state'i kullanamayız. çünkü state asenkron çalışır.
    // ve yukarıdaki setIsValid() fonksiyonu henüz çalışmamış olabilir ve bir önceki state'i döndürebilir.
    // bu yüzden fileIsValid değişkenini kullanıyoruz.
    props.onInput(props.id, pickedFile, fileIsValid);
  };

  // göze hoş gözükmeyen std dosya seçme inputuna basıyoruz.
  const pickImageHandler = () => {
    filePickerRef.current.click();
  };

  console.log(file);

  return (
    <div className="form-control">
      {/* std dosya seçiniz input'u kötü gözüküyor. Gizliyoruz ama ref ile yakalayabiliyoruz*/}
      <input
        id={props.id}
        ref={filePickerRef}
        style={{ display: "none" }}
        type="file"
        accept=".jpg,.png,.jpeg"
        onChange={pickedHandler}
      />
      <div className={`image-upload ${props.center && "center"}`}>
        <div className="image-upload__preview">
          {previewUrl && <img src={previewUrl} alt="Preview" />}
          {!previewUrl && <p>Please pick an image.</p>}
        </div>
        <Button type="button" onClick={pickImageHandler}>
          PICK IMAGE
        </Button>
      </div>
      {!isValid && <p>{props.errorText}</p>}
    </div>
  );
};

export default ImageUpload;
