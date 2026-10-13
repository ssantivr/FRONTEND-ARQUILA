import type { ReactNode } from "react";

export interface BandStat {
    label: string;
    value: string;
    detail?: string;
}

interface PageBandProps {
    title: string;
    text?: string;
    /** Figures of the page, shown as a strip along the bottom. Leave it out while they load. */
    stats?: BandStat[];
    /** What sits beside the title: the page's main action or a small chart. */
    aside?: ReactNode;
    children?: ReactNode;
}

/**
 * The dark band that opens a page: what the page is, its figures and its main action. It keeps
 * the forest green in both themes, like the sidebar, so its contents use the dark tokens.
 */
export function PageBand({ title, text, stats, aside, children }: PageBandProps) {
    return (
        <section className="page-band" data-theme="dark">
            <div className="page-band-lead">
                <div className="page-band-copy">
                    <h2>{title}</h2>
                    {text && <p>{text}</p>}
                </div>
                {aside && <div className="page-band-aside">{aside}</div>}
            </div>
            {children}
            {stats && stats.length > 0 && (
                <dl className="band-stats">
                    {stats.map((stat) => (
                        <div key={stat.label}>
                            <dt>{stat.label}</dt>
                            <dd>{stat.value}</dd>
                            {stat.detail && <dd className="band-stat-detail">{stat.detail}</dd>}
                        </div>
                    ))}
                </dl>
            )}
        </section>
    );
}
