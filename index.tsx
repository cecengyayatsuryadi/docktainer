const React = require('react');
const { useState, useEffect } = React;
const { render, Box, Text, useInput, useApp } = require('ink');
const Docker = require('dockerode');

// Dracula Palette
const dracula = {
    bg: '#282a36',
    selection: '#44475a',
    fg: '#f8f8f2',
    comment: '#6272a4',
    cyan: '#8be9fd',
    green: '#50fa7b',
    pink: '#ff79c6',
    purple: '#bd93f9',
    red: '#ff5555',
    orange: '#ffb86c'
};

const docker = new Docker();

const App = () => {
    const [containers, setContainers] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [inspectData, setInspectData] = useState('');
    const [rawInspect, setRawInspect] = useState(null);
    const [activeTab, setActiveTab] = useState('logs');
    const [scrollOffset, setScrollOffset] = useState(0);
    const [notify, setNotify] = useState({ text: '', isError: false });
    const [terminalHeight, setTerminalHeight] = useState(process.stdout.rows || 24);
    const [currentTime, setCurrentTime] = useState(new Date());
    const { exit } = useApp();

    useEffect(() => {
        const onResize = () => setTerminalHeight(process.stdout.rows);
        process.stdout.on('resize', onResize);
        const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => { 
            process.stdout.off('resize', onResize); 
            clearInterval(timeInterval);
        };
    }, []);

    const fetchContainers = async () => {
        try {
            const list = await docker.listContainers({ all: true });
            const formatted = list.map(c => ({
                id: c.Id,
                name: (c.Names && c.Names[0] ? c.Names[0].replace('/', '') : c.Id.slice(0, 12)),
                status: c.Status,
                state: c.State
            }));
            setContainers(formatted);
        } catch (err) {}
    };

    useEffect(() => {
        let ignore = false;
        if (containers[selectedIndex]) {
            const id = containers[selectedIndex].id;
            const container = docker.getContainer(id);
            container.inspect().then(data => {
                if (!ignore) {
                    setRawInspect(data);
                    setInspectData(JSON.stringify(data.Config, null, 2));
                }
            }).catch(() => {
                if (!ignore) {
                    setInspectData('Inspect failed');
                    setRawInspect(null);
                }
            });
            setScrollOffset(0);
        }
        return () => { ignore = true; };
    }, [selectedIndex, containers.length]);

    useEffect(() => {
        fetchContainers();
        const interval = setInterval(fetchContainers, 3000);
        return () => { clearInterval(interval); };
    }, []);

    useInput(async (input, key) => {
        if (input === 'q') exit();
        if (key.upArrow) setSelectedIndex(i => Math.max(0, i - 1));
        if (key.downArrow) setSelectedIndex(i => Math.min(containers.length - 1, i + 1));
        if (input === '1') { setActiveTab('logs'); setScrollOffset(0); }
        if (input === '2') { setActiveTab('inspect'); setScrollOffset(0); }
        if (input === 'j') setScrollOffset(s => s + 1);
        if (input === 'k') setScrollOffset(s => Math.max(0, s - 1));

        if (input === 's' || input === 'x') {
            const c = containers[selectedIndex];
            if (!c) return;
            const container = docker.getContainer(c.id);
            try {
                const action = input === 's' ? 'start' : 'stop';
                setNotify({ text: `${action === 'start' ? 'Starting' : 'Stopping'} ${c.name}...`, isError: false });
                await container[action]();
                setNotify({ text: `Success: ${c.name} is ${action}ed`, isError: false });
                setTimeout(() => setNotify({ text: '', isError: false }), 3000);
                fetchContainers();
            } catch (err) { setNotify({ text: err.message, isError: true }); }
        }
    });

    const calculateUptime = (startedAt) => {
        if (!startedAt || startedAt === "0001-01-01T00:00:00Z") return "N/A";
        const start = new Date(startedAt);
        const diff = Math.floor((currentTime - start) / 1000);
        if (diff < 0) return "Starting...";
        const h = Math.floor(diff / 3600);
        const m = Math.floor((diff % 3600) / 60);
        const s = diff % 60;
        return `${h}h ${m}m ${s}s`;
    };

    const renderLogsStatus = () => {
        if (!rawInspect) return <Text color={dracula.comment}>Loading VM Status...</Text>;
        const ports = rawInspect.NetworkSettings.Ports || {};
        const portList = Object.entries(ports).map(([p, bindings]) => {
            const hostPort = bindings ? bindings[0].HostPort : 'N/A';
            return `localhost:${hostPort} → ${p}`;
        });
        const uptime = rawInspect.State.Running ? calculateUptime(rawInspect.State.StartedAt) : "Stopped";
        return (
            <Box flexDirection="column" paddingLeft={2}>
                <Box marginBottom={1}><Text color={dracula.purple} bold>STATUS OPERATIONAL</Text></Box>
                <Box><Text color={dracula.cyan} bold>ID      : </Text><Text color={dracula.fg}>{rawInspect.Id.slice(0, 12)}</Text></Box>
                <Box><Text color={dracula.cyan} bold>IMAGE   : </Text><Text color={dracula.fg}>{rawInspect.Config.Image}</Text></Box>
                <Box><Text color={dracula.cyan} bold>STATUS  : </Text><Text color={rawInspect.State.Running ? dracula.green : dracula.red} bold>{rawInspect.State.Status.toUpperCase()}</Text></Box>
                <Box><Text color={dracula.cyan} bold>UPTIME  : </Text><Text color={dracula.yellow}>{uptime}</Text></Box>
                <Box marginTop={1}><Text color={dracula.pink} bold>NETWORK & PORTS</Text></Box>
                {portList.length > 0 ? portList.map((p, i) => (<Text key={i} color={dracula.fg}>  • {p}</Text>)) : <Text color={dracula.comment}>  No ports mapped</Text>}
                <Box marginTop={1}><Text color={dracula.orange} bold>COMMAND</Text></Box>
                <Text color={dracula.comment} wrap="wrap">  {(rawInspect.Config.Entrypoint || []).concat(rawInspect.Config.Cmd || []).join(' ')}</Text>
            </Box>
        );
    };

    const highlightJSON = (text) => {
        return text.split('\n').map((line, i) => {
            const parts = line.split(':');
            if (parts.length > 1) {
                return (<Text key={i}><Text color={dracula.cyan}>{parts[0]}</Text>:<Text color={dracula.orange}>{parts.slice(1).join(':')}</Text></Text>);
            }
            return <Text key={i} color={dracula.fg}>{line}</Text>;
        });
    };

    const lines = inspectData.split('\n');
    const maxVisibleLines = 25; 
    const visibleLines = lines.slice(scrollOffset, scrollOffset + maxVisibleLines);

    return (
        <Box flexDirection="column" height={terminalHeight} paddingX={1} paddingTop={1} paddingBottom={1}>
            <Box flexDirection="row" marginBottom={0}>
                <Box width={30} paddingLeft={1}><Text color={dracula.purple} bold>VIRTUAL MACHINES</Text></Box>
                <Box flexGrow={1} paddingLeft={2} justifyContent="space-between">
                    <Text color={dracula.pink} bold>{activeTab === 'logs' ? 'STATUS' : 'INSPECT'}: {containers[selectedIndex]?.name || '...'}</Text>
                    <Box><Text color={activeTab === 'logs' ? dracula.green : dracula.comment} bold={activeTab === 'logs'}> [1] STATUS </Text><Text color={activeTab === 'inspect' ? dracula.green : dracula.comment} bold={activeTab === 'inspect'}> [2] INSPECT </Text></Box>
                </Box>
            </Box>

            <Box flexDirection="row" flexGrow={1}>
                <Box flexDirection="column" width={30} borderStyle="round" borderColor={dracula.comment} paddingX={1} paddingTop={0}>
                    {containers.map((c, i) => {
                        const isSelected = i === selectedIndex;
                        const isRunning = c.state === 'running' || c.status.toLowerCase().includes('up');
                        return (
                            <Box key={c.id}>
                                <Text color={isSelected ? dracula.purple : dracula.fg} bold={isSelected}>{isSelected ? '→ ' : '  '}<Text color={isRunning ? dracula.green : dracula.red}>● </Text>{c.name.slice(0, 18)}</Text>
                            </Box>
                        );
                    })}
                </Box>

                <Box flexDirection="column" flexGrow={1} borderStyle="round" borderColor={dracula.comment} paddingX={1} paddingTop={0} marginLeft={1}>
                    {activeTab === 'logs' ? (
                        <Box paddingTop={0}>{renderLogsStatus()}</Box>
                    ) : (
                        <Box flexDirection="column">
                            {visibleLines.map((line, i) => {
                                const lineNum = scrollOffset + i + 1;
                                return (
                                    <Box key={i}>
                                        <Text color={dracula.comment}>{lineNum.toString().padStart(3, ' ')} </Text>
                                        <Text wrap="truncate">{highlightJSON(line)}</Text>
                                    </Box>
                                );
                            })}
                        </Box>
                    )}
                </Box>
            </Box>

            <Box flexDirection="row" justifyContent="space-between" alignItems="center" paddingX={1} height={1}>
                {notify.text ? (
                    <Text color="black" backgroundColor={notify.isError ? dracula.red : dracula.green} bold>  {notify.text.toUpperCase()}  </Text>
                ) : (
                    <Box alignItems="center"><Text color={dracula.purple} bold> 🐳 DOCKTAINER </Text><Text color={dracula.comment}> v1.0.0 </Text></Box>
                )}
                <Box alignItems="center"><Text color={dracula.comment}>[↑↓] Nav [1/2] Tabs [jk] Scroll [s/x] Control [q] Quit</Text></Box>
            </Box>
        </Box>
    );
};

render(<App />);
