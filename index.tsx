const React = require('react');
const { useState, useEffect } = React;
const { render, Box, Text, useInput, useApp, Spinner } = require('ink');
const Docker = require('dockerode');

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
    orange: '#ffb86c',
    yellow: '#f1fa8c'
};

const TABS = {
    CONTAINERS: 'containers',
    IMAGES: 'images',
    NETWORKS: 'networks',
    VOLUMES: 'volumes',
    LOGS: 'logs',
    COMPOSE: 'compose'
};

const docker = new Docker();

const App = () => {
    const [activeTab, setActiveTab] = useState(TABS.CONTAINERS);
    const [activeSubTab, setActiveSubTab] = useState('status');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [scrollOffset, setScrollOffset] = useState(0);
    const [notify, setNotify] = useState({ text: '', isError: false });
    const [terminalHeight, setTerminalHeight] = useState(process.stdout.rows || 24);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState([]);
    const [inspectData, setInspectData] = useState('');
    const [rawInspect, setRawInspect] = useState(null);
    const [containerStats, setContainerStats] = useState(null);
    const [showRunModal, setShowRunModal] = useState(false);
    const [composeProjects, setComposeProjects] = useState([]);
    const [runImageName, setRunImageName] = useState('');
    const [runContainerName, setRunContainerName] = useState('');
    const [runPort, setRunPort] = useState('');
    const { exit } = useApp();

    const [containers, setContainers] = useState([]);
    const [images, setImages] = useState([]);
    const [networks, setNetworks] = useState([]);
    const [volumes, setVolumes] = useState([]);

    const fetchContainers = async () => {
        try {
            const list = await docker.listContainers({ all: true });
            setContainers(list.map((c: any) => ({
                id: c.Id,
                name: c.Names?.[0]?.replace('/', '') || c.Id.slice(0, 12),
                status: c.Status,
                state: c.State,
                image: c.Image,
                labels: c.Labels || {},
                project: c.Labels?.['com.docker.compose.project'] || c.Labels?.['com.docker.compose.service'] || 'default'
            })));
        } catch (err) { console.error(err); }
    };

    const fetchImages = async () => {
        try {
            const list = await docker.listImages();
            setImages(list.map((img: any) => ({
                id: img.Id.replace('sha256:', '').slice(0, 12),
                repoTags: img.RepoTags || ['<none>:<none>'],
                size: (img.Size / 1024 / 1024).toFixed(2) + ' MB',
                created: new Date(img.Created * 1000).toLocaleDateString()
            })));
        } catch (err) { console.error(err); }
    };

    const fetchNetworks = async () => {
        try {
            const list = await docker.listNetworks();
            setNetworks(list.map((n: any) => ({
                id: n.Id.slice(0, 12),
                name: n.Name,
                driver: n.Driver,
                scope: n.Scope
            })));
        } catch (err) { console.error(err); }
    };

    const fetchVolumes = async () => {
        try {
            const list = await docker.listVolumes();
            setVolumes(list.Volumes.map((v: any) => ({
                name: v.Name,
                driver: v.Driver,
                mountpoint: v.Mountpoint,
                created: new Date(v.CreatedAt).toLocaleDateString()
            })));
        } catch (err) { console.error(err); }
    };

    const fetchContainerStats = async (containerId: string) => {
        try {
            const container = docker.getContainer(containerId);
            const stats = await container.stats({ stream: false });
            const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
            const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
            const cpuPercent = systemDelta > 0 ? (cpuDelta / systemDelta) * (stats.cpu_stats.online_cpus || 1) * 100 : 0;
            const memUsage = stats.memory_stats.usage / 1024 / 1024;
            const memLimit = stats.memory_stats.limit / 1024 / 1024;
            const memPercent = (memUsage / memLimit) * 100;
            setContainerStats({
                cpu: cpuPercent.toFixed(1),
                mem: memUsage.toFixed(1),
                memLimit: memLimit.toFixed(0),
                memPercent: memPercent.toFixed(1)
            });
        } catch (err) { 
            setContainerStats(null); 
        }
    };

    const detectComposeProjects = () => {
        const projects: any = {};
        containers.forEach((c: any) => {
            if (c.project && c.project !== 'default') {
                if (!projects[c.project]) {
                    projects[c.project] = { name: c.project, containers: [], running: 0 };
                }
                projects[c.project].containers.push(c);
                if (c.state === 'running') projects[c.project].running++;
            }
        });
        setComposeProjects(Object.values(projects));
    };

    const runContainer = async () => {
        if (!runImageName) return;
        try {
            const containerName = runContainerName || undefined;
            const portBindings: any = runPort ? { '80/tcp': [{ HostPort: runPort }] } : {};
            
            await docker.createContainer({
                Image: runImageName,
                name: containerName,
                HostConfig: {
                    PortBindings: portBindings
                }
            });
            setNotify({ text: `Created container from ${runImageName}`, isError: false });
            setTimeout(() => setNotify({ text: '', isError: false }), 3000);
            setShowRunModal(false);
            setRunImageName('');
            setRunContainerName('');
            setRunPort('');
            fetchContainers();
        } catch (err: any) { 
            setNotify({ text: err.message, isError: true }); 
        }
    };

    useEffect(() => {
        const onResize = () => setTerminalHeight(process.stdout.rows);
        process.stdout.on('resize', onResize);
        const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => { 
            process.stdout.off('resize', onResize); 
            clearInterval(timeInterval);
        };
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            if (activeTab === TABS.CONTAINERS) {
                await fetchContainers();
                detectComposeProjects();
            }
            if (activeTab === TABS.IMAGES) await fetchImages();
            if (activeTab === TABS.NETWORKS) await fetchNetworks();
            if (activeTab === TABS.VOLUMES) await fetchVolumes();
        };
        fetchData();
        const interval = setInterval(fetchData, 3000);
        return () => clearInterval(interval);
    }, [activeTab]);

    useEffect(() => {
        if (activeTab === TABS.CONTAINERS && containers[selectedIndex]) {
            const id = containers[selectedIndex].id;
            docker.getContainer(id).inspect().then(data => {
                setRawInspect(data);
                setInspectData(JSON.stringify(data, null, 2));
            }).catch(() => {
                setInspectData('Inspect failed');
                setRawInspect(null);
            });
            
            if (containers[selectedIndex].state === 'running') {
                fetchContainerStats(id);
            } else {
                setContainerStats(null);
            }
            setScrollOffset(0);
        }
    }, [selectedIndex, activeTab, containers.length]);

    const getMaxIndex = () => {
        switch (activeTab) {
            case TABS.CONTAINERS: return Math.max(0, containers.length - 1);
            case TABS.IMAGES: return Math.max(0, images.length - 1);
            case TABS.NETWORKS: return Math.max(0, networks.length - 1);
            case TABS.VOLUMES: return Math.max(0, volumes.length - 1);
            case TABS.LOGS: return Math.max(0, containers.filter(c => c.state === 'running').length - 1);
            case TABS.COMPOSE: return Math.max(0, composeProjects.length - 1);
            default: return 0;
        };
    };

    const getRunningContainers = () => containers.filter(c => c.state === 'running');

    useInput(async (input, key) => {
        if (input === 'q') exit();

        if (showRunModal) {
            if (input === 'Escape' || input === 'q') {
                setShowRunModal(false);
                setRunImageName('');
                setRunContainerName('');
                setRunPort('');
            }
            if (input === 'Enter') {
                await runContainer();
            }
            if (input === 'n') {
                const name = prompt ? prompt('Container name: ') : '';
                if (name !== null) setRunContainerName(name);
            }
            if (input === 'p') {
                const port = prompt ? prompt('Host port (e.g., 8080): ') : '';
                if (port !== null) setRunPort(port);
            }
            return;
        }
        
        if (key.upArrow) setSelectedIndex(i => Math.max(0, i - 1));
        if (key.downArrow) setSelectedIndex(i => Math.min(getMaxIndex(), i + 1));

        if (input === '1') setActiveTab(TABS.CONTAINERS);
        if (input === '2') setActiveTab(TABS.IMAGES);
        if (input === '3') setActiveTab(TABS.NETWORKS);
        if (input === '4') setActiveTab(TABS.VOLUMES);
        if (input === '5') setActiveTab(TABS.LOGS);
        if (input === '6') setActiveTab(TABS.COMPOSE);

        if (input === 'j') setScrollOffset(s => s + 1);
        if (input === 'k') setScrollOffset(s => Math.max(0, s - 1));

        if (activeTab === TABS.CONTAINERS) {
            if (input === 's') {
                const c = containers[selectedIndex];
                if (!c) return;
                try {
                    setNotify({ text: `Starting ${c.name}...`, isError: false });
                    await docker.getContainer(c.id).start();
                    setNotify({ text: `Started: ${c.name}`, isError: false });
                    setTimeout(() => setNotify({ text: '', isError: false }), 3000);
                    fetchContainers();
                } catch (err: any) { setNotify({ text: err.message, isError: true }); }
            }
            
            if (input === 'x') {
                const c = containers[selectedIndex];
                if (!c) return;
                try {
                    setNotify({ text: `Stopping ${c.name}...`, isError: false });
                    await docker.getContainer(c.id).stop();
                    setNotify({ text: `Stopped: ${c.name}`, isError: false });
                    setTimeout(() => setNotify({ text: '', isError: false }), 3000);
                    fetchContainers();
                } catch (err: any) { setNotify({ text: err.message, isError: true }); }
            }
            
            if (input === 'r' || input === 'd') {
                const c = containers[selectedIndex];
                if (!c || c.state === 'running') {
                    setNotify({ text: 'Stop container first!', isError: true });
                    setTimeout(() => setNotify({ text: '', isError: false }), 2000);
                    return;
                }
                try {
                    setNotify({ text: `Removing ${c.name}...`, isError: false });
                    await docker.getContainer(c.id).remove({ force: false });
                    setNotify({ text: `Removed: ${c.name}`, isError: false });
                    setTimeout(() => setNotify({ text: '', isError: false }), 3000);
                    fetchContainers();
                } catch (err: any) { setNotify({ text: err.message, isError: true }); }
            }
            
            if (input === '1') setActiveSubTab('status');
            if (input === '2') setActiveSubTab('inspect');
        }

        if (activeTab === TABS.IMAGES) {
            if (input === 'r') {
                const img = images[selectedIndex];
                if (!img) return;
                try {
                    setNotify({ text: `Removing image ${img.id}...`, isError: false });
                    await docker.getImage(img.id).remove();
                    setNotify({ text: `Removed: ${img.id}`, isError: false });
                    setTimeout(() => setNotify({ text: '', isError: false }), 3000);
                    fetchImages();
                } catch (err: any) { setNotify({ text: err.message, isError: true }); }
            }
            if (input === 'n') {
                const img = images[selectedIndex];
                if (img) {
                    setRunImageName(img.repoTags[0] || img.id);
                    setShowRunModal(true);
                }
            }
        }

        if (activeTab === TABS.NETWORKS) {
            if (input === 'd' || input === 'r') {
                const net = networks[selectedIndex];
                if (!net || net.name === 'bridge' || net.name === 'host' || net.name === 'none') {
                    setNotify({ text: 'Cannot remove default network!', isError: true });
                    setTimeout(() => setNotify({ text: '', isError: false }), 2000);
                    return;
                }
                try {
                    await docker.getNetwork(net.id).remove();
                    setNotify({ text: `Removed network: ${net.name}`, isError: false });
                    setTimeout(() => setNotify({ text: '', isError: false }), 3000);
                    fetchNetworks();
                } catch (err: any) { setNotify({ text: err.message, isError: true }); }
            }
        }

        if (activeTab === TABS.VOLUMES) {
            if (input === 'd' || input === 'r') {
                const vol = volumes[selectedIndex];
                if (!vol) return;
                try {
                    await docker.getVolume(vol.name).remove();
                    setNotify({ text: `Removed volume: ${vol.name}`, isError: false });
                    setTimeout(() => setNotify({ text: '', isError: false }), 3000);
                    fetchVolumes();
                } catch (err: any) { setNotify({ text: err.message, isError: true }); }
            }
        }

        if (activeTab === TABS.COMPOSE) {
            const proj = composeProjects[selectedIndex];
            if (!proj) return;
            
            if (input === 'u') {
                setNotify({ text: `Starting all ${proj.name} containers...`, isError: false });
                for (const c of proj.containers) {
                    try { await docker.getContainer(c.id).start(); } catch (e) {}
                }
                setNotify({ text: `${proj.name} started`, isError: false });
                setTimeout(() => setNotify({ text: '', isError: false }), 3000);
                fetchContainers();
            }
            if (input === 'x' || input === 'd') {
                setNotify({ text: `Stopping all ${proj.name} containers...`, isError: false });
                for (const c of proj.containers) {
                    try { await docker.getContainer(c.id).stop(); } catch (e) {}
                }
                setNotify({ text: `${proj.name} stopped`, isError: false });
                setTimeout(() => setNotify({ text: '', isError: false }), 3000);
                fetchContainers();
            }
        }
    });

    const renderSidebar = () => {
        switch (activeTab) {
            case TABS.CONTAINERS:
                return containers.map((c: any, i: number) => {
                    const isSelected = i === selectedIndex;
                    const isRunning = c.state === 'running';
                    const project = c.project && c.project !== 'default' ? `[${c.project}] ` : '';
                    return (
                        <Box key={c.id}>
                            <Text color={isSelected ? dracula.purple : dracula.fg} bold={isSelected}>
                                {isSelected ? '→ ' : '  '}
                                <Text color={isRunning ? dracula.green : dracula.red}>● </Text>
                                {project}{c.name.slice(0, 16)}
                            </Text>
                        </Box>
                    );
                });
            case TABS.IMAGES:
                return images.map((img: any, i: number) => (
                    <Box key={img.id}>
                        <Text color={i === selectedIndex ? dracula.purple : dracula.fg} bold={i === selectedIndex}>
                            {i === selectedIndex ? '→ ' : '  '}
                            <Text color={dracula.cyan}>🖼</Text> {img.id}
                        </Text>
                    </Box>
                ));
            case TABS.NETWORKS:
                return networks.map((net: any, i: number) => (
                    <Box key={net.id}>
                        <Text color={i === selectedIndex ? dracula.purple : dracula.fg} bold={i === selectedIndex}>
                            {i === selectedIndex ? '→ ' : '  '}
                            <Text color={dracula.cyan}>🌐</Text> {net.name}
                        </Text>
                    </Box>
                ));
            case TABS.VOLUMES:
                return volumes.map((vol: any, i: number) => (
                    <Box key={vol.name}>
                        <Text color={i === selectedIndex ? dracula.purple : dracula.fg} bold={i === selectedIndex}>
                            {i === selectedIndex ? '→ ' : '  '}
                            <Text color={dracula.cyan}>💾</Text> {vol.name}
                        </Text>
                    </Box>
                ));
            case TABS.LOGS:
                return getRunningContainers().map((c: any, i: number) => (
                    <Box key={c.id}>
                        <Text color={i === selectedIndex ? dracula.purple : dracula.fg} bold={i === selectedIndex}>
                            {i === selectedIndex ? '→ ' : '  '}
                            <Text color={dracula.green}>● </Text> {c.name}
                        </Text>
                    </Box>
                ));
            case TABS.COMPOSE:
                return composeProjects.map((proj: any, i: number) => (
                    <Box key={proj.name}>
                        <Text color={i === selectedIndex ? dracula.purple : dracula.pink} bold={i === selectedIndex}>
                            {i === selectedIndex ? '→ ' : '  '}
                            <Text color={proj.running === proj.containers.length ? dracula.green : dracula.orange}>● </Text>
                            {proj.name.toUpperCase()} ({proj.running}/{proj.containers.length})
                        </Text>
                    </Box>
                ));
            default:
                return null;
        }
    };

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
        return text.split('\n').map((line: string, i: number) => {
            const parts = line.split(':');
            if (parts.length > 1) {
                return (<Text key={i}><Text color={dracula.cyan}>{parts[0]}</Text>:<Text color={dracula.orange}>{parts.slice(1).join(':')}</Text></Text>);
            }
            return <Text key={i} color={dracula.fg}>{line}</Text>;
        });
    };

    const renderContent = () => {
        const contentContainer = activeTab === TABS.LOGS ? getRunningContainers() : containers;
        const currentItem = contentContainer[selectedIndex];

        switch (activeTab) {
            case TABS.CONTAINERS:
                return (
                    <Box flexDirection="column" flexGrow={1} borderStyle="round" borderColor={dracula.comment} paddingX={1} paddingTop={0} marginLeft={1}>
                        {activeSubTab === 'status' ? (
                            !rawInspect ? <Text color={dracula.comment}>Loading...</Text> : (
                                <Box flexDirection="column" paddingLeft={2}>
                                    <Box marginBottom={1}><Text color={dracula.purple} bold>STATUS OPERATIONAL</Text></Box>
                                    <Box><Text color={dracula.cyan} bold>ID      : </Text><Text color={dracula.fg}>{rawInspect.Id?.slice(0, 12)}</Text></Box>
                                    <Box><Text color={dracula.cyan} bold>IMAGE   : </Text><Text color={dracula.fg}>{rawInspect.Config?.Image}</Text></Box>
                                    <Box><Text color={dracula.cyan} bold>STATUS  : </Text><Text color={rawInspect.State?.Running ? dracula.green : dracula.red} bold>{rawInspect.State?.Status?.toUpperCase()}</Text></Box>
                                    <Box><Text color={dracula.cyan} bold>UPTIME  : </Text><Text color={dracula.yellow}>{rawInspect.State?.Running ? calculateUptime(rawInspect.State.StartedAt) : 'Stopped'}</Text></Box>
                                    {containerStats && (
                                        <>
                                            <Box marginTop={1}><Text color={dracula.pink} bold>RESOURCES</Text></Box>
                                            <Box><Text color={dracula.cyan} bold>CPU     : </Text><Text color={dracula.green}>{containerStats.cpu}%</Text></Box>
                                            <Box><Text color={dracula.cyan} bold>MEM     : </Text><Text color={dracula.green}>{containerStats.mem} MB / {containerStats.memLimit} MB ({containerStats.memPercent}%)</Text></Box>
                                        </>
                                    )}
                                </Box>
                            )
                        ) : (
                            <Box flexDirection="column">
                                {inspectData.split('\n').slice(scrollOffset, scrollOffset + 20).map((line: string, i: number) => (
                                    <Box key={i}>
                                        <Text color={dracula.comment}>{(scrollOffset + i + 1).toString().padStart(3, ' ')} </Text>
                                        <Text wrap="truncate">{highlightJSON(line)}</Text>
                                    </Box>
                                ))}
                            </Box>
                        )}
                    </Box>
                );
            
            case TABS.IMAGES:
                return (
                    <Box flexDirection="column" flexGrow={1} borderStyle="round" borderColor={dracula.comment} paddingX={1} paddingTop={0} marginLeft={1}>
                        <Box marginBottom={1} paddingLeft={1}><Text color={dracula.purple} bold>IMAGES ({images.length})</Text></Box>
                        {images.map((img: any, i: number) => (
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
            
            case TABS.NETWORKS:
                return (
                    <Box flexDirection="column" flexGrow={1} borderStyle="round" borderColor={dracula.comment} paddingX={1} paddingTop={0} marginLeft={1}>
                        <Box marginBottom={1} paddingLeft={1}><Text color={dracula.purple} bold>NETWORKS ({networks.length})</Text></Box>
                        {networks.map((net: any, i: number) => (
                            <Box key={net.id} paddingLeft={1}>
                                <Text color={i === selectedIndex ? dracula.purple : dracula.fg} bold={i === selectedIndex}>
                                    {i === selectedIndex ? '→ ' : '  '}
                                </Text>
                                <Text color={dracula.cyan}>{net.name}</Text>
                                <Text color={dracula.comment}> </Text>
                                <Text color={dracula.green}>driver: {net.driver}</Text>
                            </Box>
                        ))}
                    </Box>
                );
            
            case TABS.VOLUMES:
                return (
                    <Box flexDirection="column" flexGrow={1} borderStyle="round" borderColor={dracula.comment} paddingX={1} paddingTop={0} marginLeft={1}>
                        <Box marginBottom={1} paddingLeft={1}><Text color={dracula.purple} bold>VOLUMES ({volumes.length})</Text></Box>
                        {volumes.map((vol: any, i: number) => (
                            <Box key={vol.name} paddingLeft={1}>
                                <Text color={i === selectedIndex ? dracula.purple : dracula.fg} bold={i === selectedIndex}>
                                    {i === selectedIndex ? '→ ' : '  '}
                                </Text>
                                <Text color={dracula.cyan}>{vol.name}</Text>
                            </Box>
                        ))}
                    </Box>
                );
            
            case TABS.LOGS:
                return (
                    <Box flexDirection="column" flexGrow={1} borderStyle="round" borderColor={dracula.comment} paddingX={1} paddingTop={0} marginLeft={1}>
                        <Box marginBottom={1} paddingLeft={1}>
                            <Text color={dracula.purple} bold>LOGS: {currentItem?.name || ''}</Text>
                        </Box>
                        <Box flexDirection="column" flexGrow={1}>
                            {logs.slice(scrollOffset, scrollOffset + terminalHeight - 10).map((line: string, i: number) => (
                                <Text key={i} color={dracula.fg}>{line}</Text>
                            ))}
                        </Box>
                    </Box>
                );
            
            case TABS.COMPOSE:
                const proj = composeProjects[selectedIndex];
                return (
                    <Box flexDirection="column" flexGrow={1} borderStyle="round" borderColor={dracula.comment} paddingX={1} paddingTop={0} marginLeft={1}>
                        <Box marginBottom={1} paddingLeft={1}><Text color={dracula.purple} bold>COMPOSE: {proj?.name?.toUpperCase() || ''}</Text></Box>
                        <Box paddingLeft={1}><Text color={dracula.cyan}>Status: </Text><Text color={proj?.running === proj?.containers?.length ? dracula.green : dracula.orange}>{proj?.running}/{proj?.containers?.length} running</Text></Box>
                        <Box marginTop={1}><Text color={dracula.pink} bold>CONTAINERS</Text></Box>
                        {proj?.containers?.map((c: any) => (
                            <Box key={c.id} paddingLeft={1}>
                                <Text color={c.state === 'running' ? dracula.green : dracula.red}>● </Text>
                                <Text color={dracula.fg}>{c.name}</Text>
                                <Text color={dracula.comment}> - {c.state}</Text>
                            </Box>
                        ))}
                    </Box>
                );
        }
    };

    const getTitle = () => {
        const contentContainer = activeTab === TABS.LOGS ? getRunningContainers() : containers;
        switch (activeTab) {
            case TABS.CONTAINERS: return `CONTAINERS: ${contentContainer[selectedIndex]?.name || '...'}`;
            case TABS.IMAGES: return `IMAGES: ${images[selectedIndex]?.repoTags?.[0] || '...'}`;
            case TABS.NETWORKS: return `NETWORKS: ${networks[selectedIndex]?.name || '...'}`;
            case TABS.VOLUMES: return `VOLUMES: ${volumes[selectedIndex]?.name || '...'}`;
            case TABS.LOGS: return `LOGS: ${contentContainer[selectedIndex]?.name || '...'}`;
            case TABS.COMPOSE: return `COMPOSE: ${composeProjects[selectedIndex]?.name || '...'}`;
        }
    };

    const getKeybindings = () => {
        if (activeTab === TABS.CONTAINERS) return '[↑↓] Nav [1/2] Tabs [s] Start [x] Stop [r] Remove [jk] Scroll [q] Quit';
        if (activeTab === TABS.IMAGES) return '[↑↓] Nav [n] Run [r] Remove [q] Quit';
        if (activeTab === TABS.NETWORKS) return '[↑↓] Nav [d] Delete [q] Quit';
        if (activeTab === TABS.VOLUMES) return '[↑↓] Nav [d] Delete [q] Quit';
        if (activeTab === TABS.COMPOSE) return '[↑↓] Nav [u] Up [d] Down [q] Quit';
        if (activeTab === TABS.LOGS) return '[↑↓] Select [jk] Scroll [q] Quit';
        return '[q] Quit';
    };

    const tabs = [
        { key: '1', tab: TABS.CONTAINERS, label: 'Containers' },
        { key: '2', tab: TABS.IMAGES, label: 'Images' },
        { key: '3', tab: TABS.NETWORKS, label: 'Networks' },
        { key: '4', tab: TABS.VOLUMES, label: 'Volumes' },
        { key: '5', tab: TABS.LOGS, label: 'Logs' },
        { key: '6', tab: TABS.COMPOSE, label: 'Compose' },
    ];

    return (
        <Box flexDirection="column" height={terminalHeight} paddingX={1} paddingTop={1} paddingBottom={1}>
            <Box flexDirection="row" marginBottom={0}>
                <Box width={20} paddingLeft={1}><Text color={dracula.purple} bold>DOCKTAINER</Text></Box>
                <Box flexGrow={1} paddingLeft={2} justifyContent="space-between">
                    <Text color={dracula.pink} bold>{getTitle()}</Text>
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

            <Box flexDirection="row" flexGrow={1}>
                <Box flexDirection="column" width={30} borderStyle="round" borderColor={dracula.comment} paddingX={1} paddingTop={0}>
                    {renderSidebar()}
                </Box>
                {renderContent()}
            </Box>

            <Box flexDirection="row" justifyContent="space-between" alignItems="center" paddingX={1} height={1}>
                {notify.text ? (
                    <Text color="black" backgroundColor={notify.isError ? dracula.red : dracula.green} bold>  {notify.text.toUpperCase()}  </Text>
                ) : showRunModal ? (
                    <Text color={dracula.yellow}> [n] Name [p] Port [Enter] Run [Esc] Cancel </Text>
                ) : (
                    <Box alignItems="center"><Text color={dracula.purple} bold>🐳 DOCKTAINER</Text><Text color={dracula.comment}> v1.1.0</Text></Box>
                )}
                <Box alignItems="center"><Text color={dracula.comment}>{getKeybindings()}</Text></Box>
            </Box>

            {showRunModal && (
                <Box position="absolute" top={10} left={15} width={50} borderStyle="round" borderColor={dracula.purple} paddingX={2} paddingY={1} flexDirection="column">
                    <Box><Text color={dracula.purple} bold>RUN CONTAINER</Text></Box>
                    <Box marginTop={1}><Text color={dracula.cyan}>Image: </Text><Text color={dracula.fg}>{runImageName}</Text></Box>
                    <Box><Text color={dracula.cyan}>Name: </Text><Text color={dracula.fg}>{runContainerName || '(auto)'}</Text></Box>
                    <Box><Text color={dracula.cyan}>Port: </Text><Text color={dracula.fg}>{runPort ? `80 -> ${runPort}` : '(none)'}</Text></Box>
                    <Box marginTop={1}><Text color={dracula.comment}>[n] name [p] port [enter] run [esc] cancel</Text></Box>
                </Box>
            )}
        </Box>
    );
};

render(React.createElement(App));
