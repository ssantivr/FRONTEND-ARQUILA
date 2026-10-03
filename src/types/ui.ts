export interface SectionProps {
    projectId: number;
    run: (action: () => Promise<unknown>, onDone: () => void) => Promise<void>;
}
