# Employee Management API


## Postman

Two things worth knowing:
- `{{baseUrl}}` defaults to `http://localhost:3000`: change it in the collection variables if your port differs                        
-  Token is captured automatically: the Register and Login requests both have a test script that saves the JWT to `{{token}}`, so all employee requests are authorized immediately after you log in without copying anything manually    