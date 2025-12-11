# Concept Plan

The idea is to create a cookbook application that runs Django on the backend and angular on the frontend. This makes the development easy and allows for a wide range of customization. 

## Key features:
- persistent login (SSO)
- public read, owner write
- create/edit/delete recipes
- add recipes from various sources
- user divided model
- backend support to allow recipe creation from various sources
- frontend support for both desktop and mobile

## Data model notes
- Recipes keep optional metadata like prep time, cook time, total time, origin text, source name, source url, author name, cuisine, course, difficulty, calories, nutrition json, equipment, notes, video url. Required recipe fields are title, ingredients, instructions.
- Users have a role field for admin or user. Users keep UI customization in theme json, layout json, and a widget whitelist list. Preferences json remains for miscellaneous settings.
