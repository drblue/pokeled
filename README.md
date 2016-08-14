# PokeLED

Quick hack connecting a specific Pokemon Go-gym's owning team with a [Blinkstick](https://www.blinkstick.com/) (USB-connected multi-color LED-strip).

## Installation

Clone the repo, run `npm install`, copy `config.example.js` to `config.js` and enter your [Pokemon Trainer Club (PTC)](https://club.pokemon.com/us/pokemon-trainer-club/sign-up/) account credentials *(use a dummy-account, not the one you're actively playing with!)*.

## Usage

Run `poke.js` with whatever node-runner you like (just plain old `node`, perhaps `nodemon` or `forever`, or why not the awesome `pm2`). A sample `ecosystem.json` for `pm2` is included as I use it to deploy to my Raspberry Pi v1 which has the Blinkstick connected to it in my bedroom window.

## Contributing

1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request :D

## History

TODO: Write history

## Credits

Uses the awesome [`Pokemon-GO-node-api` by Armax](https://github.com/Armax/Pokemon-GO-node-api) and the [`pogobuf` by cyraxx](https://github.com/cyraxx/pogobuf/) node-modules.

## License ##

ISC License
Copyright (c) 2016, Johan Nordström <johan@digitalvillage.se>
Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.
THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
