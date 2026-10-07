import { InteriorViewer } from "../components/InteriorViewer";
import { Panel } from "../components/Panel";

export function InteriorPage() {
    return (
        <Panel title="Escena de muestra">
            <p className="message">
                Interior de un loft residencial de doble altura, con escalera, entrepiso y la ciudad
                al atardecer tras el ventanal. Es una escena de muestra: no usa los datos de ningún
                proyecto.
            </p>
            <InteriorViewer />
        </Panel>
    );
}
