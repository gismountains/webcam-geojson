## webcam-geojson

Uses the Windy Webcam API: https://api.windy.com/webcams/docs to create a geojson with all webcams within a defined boundingbox.   
To use the windy webcam api a key is needed which can be created in https://api.windy.com/keys. After key-creation you can create a `.env`-file and add the key with : `WINDYKEY=***`

Windy-API do not have the elevation for the webcam. This script uses the [World Elevation Terrain service](https://www.arcgis.com/home/item.html?id=58a541efc59545e6b7137f961d7de883) from ESRI to add the elevation data. To use the service an [ArcGIS Developers Account](https://developers.arcgis.com/sign-up/) is needed. Within the account an [API key](https://developers.arcgis.com/api-keys/) can be created and added to the `.env`-file with : `ARCGISAPIKEY=***`



### Output
Daily created output for all webcams within the bounding box of the alps can be found at:
https://gismountains.github.io/webcam-geojson/api/webcam-alps.geojson


### Create the URL's with id to link to webpage-link, images, player

Link to Windy-Webcam-Page:   
https://www.windy.com/webcams/{id}

Links to current images:  
(48x48)   https://images-webcams.windy.com/{id(last2digits)}/{id}/current/icon/{id}.jpg  
(200x112) https://images-webcams.windy.com/{id(last2digits)}/{id}/current/thumbnail/{id}.jpg  
(400x224) https://images-webcams.windy.com/{id(last2digits)}/{id}/current/preview/{id}.jpg  
 
Links to daylight images:  
(48x48)   https://images-webcams.windy.com/{id(last2digits)}/{id}/daylight/icon/{id}.jpg  
(200x112) https://images-webcams.windy.com/{id(last2digits)}/{id}/daylight/thumbnail/{id}.jpg  
(400x224) https://images-webcams.windy.com/{id(last2digits)}/{id}/daylight/preview/{id}.jpg  

Links to embedded player:  
day      https://webcams.windy.com/webcams/public/embed/player/{id}/day  
month    https://webcams.windy.com/webcams/public/embed/player/{id}/month  
year     https://webcams.windy.com/webcams/public/embed/player/{id}/year  
lifetime https://webcams.windy.com/webcams/public/embed/player/{id}/lifetime  
