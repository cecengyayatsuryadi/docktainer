export const dracula = {
    bg: '#282a36',
    selection: '#44475a',
    fg: '#f8f8f2',
    comment: '#6272a4',
    cyan: '#8be9fd',
    green: '#50fa7b',
    pink: '#ff79c6',
    purple: '#bd93f9',
    red: '#ff5555',
    orange: '#ffb86c',
    yellow: '#f1fa8c'
};

export const TABS = {
    CONTAINERS: 'containers',
    IMAGES: 'images',
    NETWORKS: 'networks',
    VOLUMES: 'volumes',
    LOGS: 'logs'
} as const;

export type TabType = typeof TABS[keyof typeof TABS];
