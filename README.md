# js-noisy-gradient
Small and fast lib for smoothing visible banding in linear-gradient backgrounds.

## Intro ##

Gradient fills that use colors that are close to each other are prone
to producing a visual artefact called [color banding](https://en.wikipedia.org/wiki/Colour_banding).

For example, vertical `linear-gradient` from #112233 to #223344 looks like this:

![#123-to-#234](gradient-raw.png)

Depending on your monitor and the lighting conditions the effect may be pronounced or just barely visible. 
Here's the same image with luminosity levels adjusted to exaggerate the effect:

![#123-to-#234 exaggerated](gradient-raw-ex.png)

Banding is certainly not an Earth-shattering issue, but when it's noticeable,
it tends to stick out and detract the attention from the rest of the design.

## Solution ##

There is however a very simple solution. It works by adding a small amount
of noise to the image, so that _some_ pixels become a little bit lighter
and some - a little bit darker.

By varying the amount of noise and the strength of lightening/darkening
it is possible to _blend_ bands together, albeit at the expense of adding
a bit of a texture.

![#123-to-#234 smoothed](gradient-smooted.png)
