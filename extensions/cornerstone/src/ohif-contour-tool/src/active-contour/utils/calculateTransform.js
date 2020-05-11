import {Transform} from "./transform";

export default function calculateTransform(evtData,canvas, scale) {

    const transform = new Transform();

    // Move to center of canvas
    transform.translate(canvas.width / 2, canvas.height / 2);

    // Apply the rotation before scaling for non square pixels
    const angle = evtData.viewport.rotation;

    if (angle !== 0) {
        transform.rotate(angle * Math.PI / 180);
    }

    // Apply the scale
    let widthScale = evtData.viewport.scale;
    let heightScale = evtData.viewport.scale;

    const width = evtData.viewport.displayedArea.brhc.x - (evtData.viewport.displayedArea.tlhc.x - 1);
    const height = evtData.viewport.displayedArea.brhc.y - (evtData.viewport.displayedArea.tlhc.y - 1);

    if (evtData.viewport.displayedArea.presentationSizeMode === 'NONE') {
        if (evtData.image.rowPixelSpacing < evtData.image.columnPixelSpacing) {
            widthScale *= (evtData.image.columnPixelSpacing / evtData.image.rowPixelSpacing);
        } else if (evtData.image.columnPixelSpacing < evtData.image.rowPixelSpacing) {
            heightScale *= (evtData.image.rowPixelSpacing / evtData.image.columnPixelSpacing);
        }
    } else {
        // These should be good for "TRUE SIZE" and "MAGNIFY"
        widthScale = evtData.viewport.displayedArea.columnPixelSpacing;
        heightScale = evtData.viewport.displayedArea.rowPixelSpacing;

        if (evtData.viewport.displayedArea.presentationSizeMode === 'SCALE TO FIT') {
            // Fit TRUE IMAGE image (width/height) to window
            const verticalScale = evtData.canvas.height / (height * heightScale);
            const horizontalScale = evtData.canvas.width / (width * widthScale);

            // Apply new scale
            widthScale = heightScale = Math.min(horizontalScale, verticalScale);

            if (evtData.viewport.displayedArea.rowPixelSpacing < evtData.viewport.displayedArea.columnPixelSpacing) {
                widthScale *= (evtData.viewport.displayedArea.columnPixelSpacing / evtData.viewport.displayedArea.rowPixelSpacing);
            } else if (evtData.viewport.displayedArea.columnPixelSpacing < evtData.viewport.displayedArea.rowPixelSpacing) {
                heightScale *= (evtData.viewport.displayedArea.rowPixelSpacing / evtData.viewport.displayedArea.columnPixelSpacing);
            }
        }
    }

    transform.scale(widthScale, heightScale);

    // Unrotate to so we can translate unrotated
    if (angle !== 0) {
        transform.rotate(-angle * Math.PI / 180);
    }

    // Apply the pan offset
    transform.translate(evtData.viewport.translation.x, evtData.viewport.translation.y);

    // Rotate again so we can apply general scale
    if (angle !== 0) {
        transform.rotate(angle * Math.PI / 180);
    }

    if (scale !== undefined) {
        // Apply the font scale
        transform.scale(scale, scale);
    }

    // Apply Flip if required
    if (evtData.viewport.hflip) {
        transform.scale(-1, 1);
    }

    if (evtData.viewport.vflip) {
        transform.scale(1, -1);
    }

    // Move back from center of image
    transform.translate(-width / 2, -height / 2);

    return transform;
}