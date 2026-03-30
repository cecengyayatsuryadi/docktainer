import React from 'react';
import { Box, Text } from 'ink';
import { dracula } from '../constants/theme';
import { Container, Image, Network, Volume } from '../hooks/useDocker';

interface SidebarProps {
    activeTab: string;
    selectedIndex: number;
    containers: Container[];
    images: Image[];
    networks: Network[];
    volumes: Volume[];
}

export const Sidebar: React.FC<SidebarProps> = ({
    activeTab,
    selectedIndex,
    containers,
    images,
    networks,
    volumes
}) => {
    const renderContainers = () => {
        return containers.map((c, i) => {
            const isSelected = i === selectedIndex;
            const isRunning = c.state === 'running' || c.status.toLowerCase().includes('up');
            const project = c.project && c.project !== 'default' ? `[${c.project}] ` : '';
            return (
                <Box key={c.id}>
                    <Text color={isSelected ? dracula.purple : dracula.fg} bold={isSelected}>
                        {isSelected ? '→ ' : '  '}
                        <Text color={isRunning ? dracula.green : dracula.red}>● </Text>
                        {project}{c.name.slice(0, 18 - project.length)}
                    </Text>
                </Box>
            );
        });
    };

    const renderImages = () => images.map((img, i) => (
        <Box key={img.id}>
            <Text color={i === selectedIndex ? dracula.purple : dracula.fg} bold={i === selectedIndex}>
                {i === selectedIndex ? '→ ' : '  '}
                <Text color={dracula.cyan}>🖼</Text> {img.id}
            </Text>
        </Box>
    ));

    const renderNetworks = () => networks.map((net, i) => (
        <Box key={net.id}>
            <Text color={i === selectedIndex ? dracula.purple : dracula.fg} bold={i === selectedIndex}>
                {i === selectedIndex ? '→ ' : '  '}
                <Text color={dracula.cyan}>🌐</Text> {net.name}
            </Text>
        </Box>
    ));

    const renderVolumes = () => volumes.map((vol, i) => (
        <Box key={vol.name}>
            <Text color={i === selectedIndex ? dracula.purple : dracula.fg} bold={i === selectedIndex}>
                {i === selectedIndex ? '→ ' : '  '}
                <Text color={dracula.cyan}>💾</Text> {vol.name}
            </Text>
        </Box>
    ));

    const renderLogs = () => containers.filter(c => c.state === 'running').map((c, i) => (
        <Box key={c.id}>
            <Text color={i === selectedIndex ? dracula.purple : dracula.fg} bold={i === selectedIndex}>
                {i === selectedIndex ? '→ ' : '  '}
                <Text color={dracula.green}>● </Text> {c.name}
            </Text>
        </Box>
    ));

    const renderContent = () => {
        if (!containers || containers.length === 0) return <Text color={dracula.comment}>No containers</Text>;
        
        switch (activeTab) {
            case 'containers': return renderContainers();
            case 'images': return (!images || images.length === 0) ? <Text color={dracula.comment}>No images</Text> : renderImages();
            case 'networks': return (!networks || networks.length === 0) ? <Text color={dracula.comment}>No networks</Text> : renderNetworks();
            case 'volumes': return (!volumes || volumes.length === 0) ? <Text color={dracula.comment}>No volumes</Text> : renderVolumes();
            case 'logs': return renderLogs();
            default: return null;
        }
    };

    return (
        <Box flexDirection="column" width={35} borderStyle="round" borderColor={dracula.comment} paddingX={1} paddingTop={0}>
            {renderContent()}
        </Box>
    );
};
