import React from 'react';
import { Box, Text } from 'ink';
import { dracula } from '../constants/theme';
import { Container, Image, Network, Volume } from '../hooks/useDocker';

interface ContentProps {
    activeTab: string;
    activeSubTab: string;
    selectedIndex: number;
    scrollOffset: number;
    terminalHeight: number;
    containers: Container[];
    images: Image[];
    networks: Network[];
    volumes: Volume[];
    logs: string[];
    inspectData: string;
    rawInspect: any;
    currentTime: Date;
}

export const Content: React.FC<ContentProps> = ({
    activeTab,
    activeSubTab,
    selectedIndex,
    scrollOffset,
    terminalHeight,
    containers,
    images,
    networks,
    volumes,
    logs,
    inspectData,
    rawInspect,
    currentTime
}) => {
    const calculateUptime = (startedAt: string) => {
        if (!startedAt || startedAt === "0001-01-01T00:00:00Z") return "N/A";
        const start = new Date(startedAt);
        const diff = Math.floor((currentTime.getTime() - start.getTime()) / 1000);
        if (diff < 0) return "Starting...";
        const h = Math.floor(diff / 3600);
        const m = Math.floor((diff % 3600) / 60);
        const s = diff % 60;
        return `${h}h ${m}m ${s}s`;
    };

    const highlightJSON = (text: string) => {
        return text.split('\n').map((line, i) => {
            const parts = line.split(':');
            if (parts.length > 1) {
                return (<Text key={i}><Text color={dracula.cyan}>{parts[0]}</Text>:<Text color={dracula.orange}>{parts.slice(1).join(':')}</Text></Text>);
            }
            return <Text key={i} color={dracula.fg}>{line}</Text>;
        });
    };

    const renderContainerStatus = () => {
        if (!rawInspect) return <Text color={dracula.comment}>Loading...</Text>;
        const ports = rawInspect.NetworkSettings?.Ports || {};
        const portList = Object.entries(ports).map(([p, bindings]: [string, any]) => {
            const hostPort = bindings ? bindings[0].HostPort : 'N/A';
            return `localhost:${hostPort} → ${p}`;
        });
        const uptime = rawInspect.State?.Running ? calculateUptime(rawInspect.State.StartedAt) : "Stopped";
        
        return (
            <Box flexDirection="column" paddingLeft={2}>
                <Box marginBottom={1}><Text color={dracula.purple} bold>STATUS OPERATIONAL</Text></Box>
                <Box><Text color={dracula.cyan} bold>ID      : </Text><Text color={dracula.fg}>{rawInspect.Id?.slice(0, 12)}</Text></Box>
                <Box><Text color={dracula.cyan} bold>IMAGE   : </Text><Text color={dracula.fg}>{rawInspect.Config?.Image}</Text></Box>
                <Box><Text color={dracula.cyan} bold>STATUS  : </Text><Text color={rawInspect.State?.Running ? dracula.green : dracula.red} bold>{rawInspect.State?.Status?.toUpperCase()}</Text></Box>
                <Box><Text color={dracula.cyan} bold>UPTIME  : </Text><Text color={dracula.yellow}>{uptime}</Text></Box>
                <Box marginTop={1}><Text color={dracula.pink} bold>NETWORK & PORTS</Text></Box>
                {portList.length > 0 ? portList.map((p, i) => (<Text key={i} color={dracula.fg}>  • {p}</Text>)) : <Text color={dracula.comment}>  No ports mapped</Text>}
                <Box marginTop={1}><Text color={dracula.orange} bold>COMMAND</Text></Box>
                <Text color={dracula.comment} wrap="wrap">  {((rawInspect.Config?.Entrypoint || []).concat(rawInspect.Config?.Cmd || [])).join(' ')}</Text>
            </Box>
        );
    };

    const renderContainers = () => (
        <Box flexDirection="column" flexGrow={1} borderStyle="round" borderColor={dracula.comment} paddingX={1} paddingTop={0} marginLeft={1}>
            {activeSubTab === 'status' ? (
                <Box paddingTop={0}>{renderContainerStatus()}</Box>
            ) : (
                <Box flexDirection="column">
                    {inspectData.split('\n').slice(scrollOffset, scrollOffset + 20).map((line, i) => (
                        <Box key={i}>
                            <Text color={dracula.comment}>{(scrollOffset + i + 1).toString().padStart(3, ' ')} </Text>
                            <Text wrap="truncate">{highlightJSON(line)}</Text>
                        </Box>
                    ))}
                </Box>
            )}
        </Box>
    );

    const renderImages = () => (
        <Box flexDirection="column" flexGrow={1} borderStyle="round" borderColor={dracula.comment} paddingX={1} paddingTop={0} marginLeft={1}>
            <Box marginBottom={1} paddingLeft={1}><Text color={dracula.purple} bold>IMAGES ({images.length})</Text></Box>
            {images.map((img, i) => (
                <Box key={img.id} paddingLeft={1}>
                    <Text color={i === selectedIndex ? dracula.purple : dracula.fg} bold={i === selectedIndex}>
                        {i === selectedIndex ? '→ ' : '  '}
                    </Text>
                    <Text color={dracula.cyan}>{img.id}</Text>
                    <Text color={dracula.comment}> </Text>
                    <Text color={dracula.green}>{img.repoTags[0]}</Text>
                    <Text color={dracula.comment}> </Text>
                    <Text color={dracula.orange}>{img.size}</Text>
                </Box>
            ))}
        </Box>
    );

    const renderNetworks = () => (
        <Box flexDirection="column" flexGrow={1} borderStyle="round" borderColor={dracula.comment} paddingX={1} paddingTop={0} marginLeft={1}>
            <Box marginBottom={1} paddingLeft={1}><Text color={dracula.purple} bold>NETWORKS ({networks.length})</Text></Box>
            {networks.map((net, i) => (
                <Box key={net.id} paddingLeft={1}>
                    <Text color={i === selectedIndex ? dracula.purple : dracula.fg} bold={i === selectedIndex}>
                        {i === selectedIndex ? '→ ' : '  '}
                    </Text>
                    <Text color={dracula.cyan}>{net.name}</Text>
                    <Text color={dracula.comment}> </Text>
                    <Text color={dracula.green}>driver: {net.driver}</Text>
                    <Text color={dracula.comment}> </Text>
                    <Text color={dracula.orange}>scope: {net.scope}</Text>
                </Box>
            ))}
        </Box>
    );

    const renderVolumes = () => (
        <Box flexDirection="column" flexGrow={1} borderStyle="round" borderColor={dracula.comment} paddingX={1} paddingTop={0} marginLeft={1}>
            <Box marginBottom={1} paddingLeft={1}><Text color={dracula.purple} bold>VOLUMES ({volumes.length})</Text></Box>
            {volumes.map((vol, i) => (
                <Box key={vol.name} paddingLeft={1} flexDirection="column">
                    <Box>
                        <Text color={i === selectedIndex ? dracula.purple : dracula.fg} bold={i === selectedIndex}>
                            {i === selectedIndex ? '→ ' : '  '}
                        </Text>
                        <Text color={dracula.cyan}>{vol.name}</Text>
                    </Box>
                    <Box paddingLeft={3}>
                        <Text color={dracula.comment}>driver: {vol.driver}</Text>
                        <Text color={dracula.comment}> | </Text>
                        <Text color={dracula.orange}>created: {vol.created}</Text>
                    </Box>
                </Box>
            ))}
        </Box>
    );

    const renderLogs = () => (
        <Box flexDirection="column" flexGrow={1} borderStyle="round" borderColor={dracula.comment} paddingX={1} paddingTop={0} marginLeft={1}>
            <Box marginBottom={1} paddingLeft={1}>
                <Text color={dracula.purple} bold>LOGS: {containers[selectedIndex]?.name || ''}</Text>
                <Text color={dracula.comment}> [c] clear</Text>
            </Box>
            <Box flexDirection="column" flexGrow={1}>
                {logs.slice(scrollOffset, scrollOffset + terminalHeight - 10).map((line, i) => (
                    <Text key={i} color={dracula.fg}>{line}</Text>
                ))}
            </Box>
        </Box>
    );

    switch (activeTab) {
        case 'containers': return renderContainers();
        case 'images': return renderImages();
        case 'networks': return renderNetworks();
        case 'volumes': return renderVolumes();
        case 'logs': return renderLogs();
        default: return null;
    }
};
