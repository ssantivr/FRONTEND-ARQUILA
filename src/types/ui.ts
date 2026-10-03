// Props shared by the data panels of the project detail page. `run` executes
// an API action, reports its error in the page and calls onDone on success.
export interface SectionProps {
    projectId: number;
    run: (action: () => Promise<unknown>, onDone: () => void) => Promise<void>;
}
