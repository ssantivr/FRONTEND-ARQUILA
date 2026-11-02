import { useAsync } from "../../hooks/useAsync";
import { preferencesApi } from "../../services/api";
import { DEFAULT_QUALITY, isPreviewQuality, type PreviewQuality } from "../../three/engine/quality";

/** The account's `preview_quality`. Until it arrives, or if it can't, the viewer uses the default. */
export function usePreviewQuality(): PreviewQuality {
    const preferences = useAsync(() => preferencesApi.get(), []);
    const quality = preferences.data?.preview_quality;

    return isPreviewQuality(quality) ? quality : DEFAULT_QUALITY;
}
