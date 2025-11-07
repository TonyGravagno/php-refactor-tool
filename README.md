# PHP Refactor Tool

[![Latest Release](https://vsmarketplacebadges.dev/version-short/st-pham.php-refactor-tool.png)](https://marketplace.visualstudio.com/items?itemName=st-pham.php-refactor-tool) [![Downloads](https://vsmarketplacebadges.dev/downloads-short/st-pham.php-refactor-tool.png)](https://marketplace.visualstudio.com/items?itemName=st-pham.php-refactor-tool) [![Rating](https://vsmarketplacebadges.dev/rating-short/st-pham.php-refactor-tool.png)](https://marketplace.visualstudio.com/items?itemName=st-pham.php-refactor-tool#review-details)

If this extension is useful for you, feel free to buy me a coffee, it'd give me more motivation to add more features ♥️♥️♥️

[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/tungps881)

You can join this discord server to discuss about current/future features more easily :)

[![](https://dcbadge.vercel.app/api/server/NYMutPhV)](https://discord.gg/NYMutPhV)

## Description

- PHP Refactor Tool helps users to refactor their code easily and safely
- The extension is made for object-oriented programming (OOP) in PHP

## Features

- Rename symbols
    - Update the name of file or the namespace if needed in case of `Class`, `Interface`, `Abstract`, ...
    - Update `Getter` and `Setter` when renaming `Property`

Rename Class
![Rename Class](https://i.imgur.com/Aq0YZAB.gif)

Rename Method
![Rename Method](https://i.imgur.com/BIEGjDQ.gif)

## Installation

- Install dependency extension `PHP Intelephense`
- All extensions with the same functionality should be disabled to obtain the best result.

### Configuration (new in 0.6.1)

`phpRefactorTool.fileNamePattern`

- `symbol` (default) : On change of class to `Foo_Bar`, set file name to `Foo_Bar.php`
- `wordpress` : On change of class to `My_Plugin_FooBar`, set file name to `my-plugin-foo-bar.php`

## Usage

Use key `F2` or right-click and choose `Rename Symbol` on the symbol you want to rename.

## Work in progress features
- When moving/renaming files, change the namespace and its usages

## Known Issues

Does not (yet) modify require/require_once statements. You must do this manually.

If you have any problems please let me know, I'll try to fix it as time permits.

## Run tests

`npm run test`
