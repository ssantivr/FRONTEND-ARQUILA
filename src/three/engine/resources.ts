export interface Disposable {
    dispose: () => void;
}

/**
 * The geometries, materials, textures and targets that live as long as the engine. What belongs
 * to a model is released with the model by `disposeObject`; what outlives it is registered here,
 * so that closing the viewer has one place to go through.
 */
export interface Resources {
    track: <Item extends Disposable>(item: Item) => Item;
    /** Frees one resource before the end, for example one that is being replaced. */
    release: (item: Disposable) => void;
    count: () => number;
    disposeAll: () => void;
}

export function createResources(): Resources {
    const items = new Set<Disposable>();

    return {
        track: (item) => {
            items.add(item);

            return item;
        },
        release: (item) => {
            if (items.delete(item)) {
                item.dispose();
            }
        },
        count: () => items.size,
        disposeAll: () => {
            // Last in, first out: what was built on top of something goes before it.
            for (const item of [...items].reverse()) {
                item.dispose();
            }

            items.clear();
        },
    };
}
