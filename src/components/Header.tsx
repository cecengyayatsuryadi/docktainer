import React from 'react';
import { Box, Text } from 'ink';
import { dracula, TABS, TabType } from '../constants/theme';

interface HeaderProps {
    activeTab: TabType;
    title: string;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, title }) => {
    const tabs = [
        { key: '1', tab: TABS.CONTAINERS, label: 'Containers' },
        { key: '2', tab: TABS.IMAGES, label: 'Images' },
        { key: '3', tab: TABS.NETWORKS, label: 'Networks' },
        { key: '4', tab: TABS.VOLUMES, label: 'Volumes' },
        { key: '5', tab: TABS.LOGS, label: 'Logs' },
    ];

    return (
        <Box flexDirection="row" marginBottom={0}>
            <Box width={20} paddingLeft={1}><Text color={dracula.purple} bold>DOCKTAINER</Text></Box>
            <Box flexGrow={1} paddingLeft={2} justifyContent="space-between">
                <Text color={dracula.pink} bold>{title}</Text>
                <Box>
                    {tabs.map(({ key, tab, label }) => (
                        <Text 
                            key={key} 
                            color={activeTab === tab ? dracula.green : dracula.comment} 
                            bold={activeTab === tab}
                        > [{key}] {label} </Text>
                    ))}
                </Box>
            </Box>
        </Box>
    );
};
