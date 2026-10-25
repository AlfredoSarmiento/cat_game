# Cat Clicker

Click the cats as they pop up. Catch enough of them and you win.

## Play

Double-click `index.html` to open it in your browser. Nothing to install.

## Add your own cats

1. Copy your cat pictures into the `cats` folder. PNG, JPG, GIF, WebP and SVG all work. Stickers with a see-through background (PNG, WebP or SVG) look best.
2. Open `cats/cats.js` and add each file name to the list, in quotes, separated by commas:

   ```js
   cats: [
     "orange.svg",
     "my-cat.png",
     "grumpy-face.jpg",
   ],
   ```

3. Refresh the page.

A name that doesn't match a file is skipped, so a typo won't break the game.

## Change how many cats to win

In `cats/cats.js`, change the `goal` number.

## Files

| File | What it does |
|---|---|
| `index.html` | The page: start, play and win screens |
| `style.css` | Colors, layout and animations |
| `game.js` | The game rules |
| `cats/cats.js` | Your list of cats and the goal. The one file you edit. |
| `cats/*.svg` | Sample cats. Delete them or swap in your own. |
