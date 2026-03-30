import { useState, useEffect, useRef } from 'react';
import Docker from 'dockerode';

const docker = new Docker();

export interface Container {
    id: string;
    name: string;
    status: string;
    state: string;
    image: string;
    labels: Record<string, string>;
    project?: string;
}

export interface Image {
    id: string;
    repoTags: string[];
    size: string;
    created: string;
}

export interface Network {
    id: string;
    name: string;
    driver: string;
    scope: string;
}

export interface Volume {
    name: string;
    driver: string;
    mountpoint: string;
    created: string;
}

export function useDocker(activeTab: string) {
    const [containers, setContainers] = useState<Container[]>([]);
    const [images, setImages] = useState<Image[]>([]);
    const [networks, setNetworks] = useState<Network[]>([]);
    const [volumes, setVolumes] = useState<Volume[]>([]);
    const logStreamRef = useRef<Docker.DockerStream | null>(null);

    const fetchContainers = async () => {
        try {
            const list = await docker.listContainers({ all: true });
            setContainers(list.map((c: any) => {
                const labels = c.Labels || {};
                const project = labels['com.docker.compose.project'] || labels['com.docker.compose.service'] || 'default';
                return {
                    id: c.Id,
                    name: c.Names?.[0]?.replace('/', '') || c.Id.slice(0, 12),
                    status: c.Status,
                    state: c.State,
                    image: c.Image,
                    labels,
                    project
                };
            }));
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

    useEffect(() => {
        const fetchData = async () => {
            if (activeTab === 'containers') await fetchContainers();
            if (activeTab === 'images') await fetchImages();
            if (activeTab === 'networks') await fetchNetworks();
            if (activeTab === 'volumes') await fetchVolumes();
        };
        
        fetchData();
        const interval = setInterval(fetchData, 3000);
        return () => clearInterval(interval);
    }, [activeTab]);

    const startContainer = async (id: string) => {
        await docker.getContainer(id).start();
    };

    const stopContainer = async (id: string) => {
        await docker.getContainer(id).stop();
    };

    const removeContainer = async (id: string) => {
        await docker.getContainer(id).remove({ force: false });
    };

    const removeImage = async (id: string) => {
        await docker.getImage(id).remove();
    };

    const removeNetwork = async (id: string) => {
        await docker.getNetwork(id).remove();
    };

    const removeVolume = async (name: string) => {
        await docker.getVolume(name).remove();
    };

    const pullImage = async (name: string) => {
        await docker.pull(name);
    };

    const inspectContainer = async (id: string) => {
        return await docker.getContainer(id).inspect();
    };

    const streamLogs = (containerId: string, onLog: (logs: string[]) => void) => {
        if (logStreamRef.current) {
            logStreamRef.current.destroy();
            logStreamRef.current = null;
        }

        const container = docker.getContainer(containerId);
        container.logs({
            follow: true,
            stdout: true,
            stderr: true,
            tail: 100
        }).then((stream: any) => {
            logStreamRef.current = stream as any;
            let buffer = '';
            stream.on('data', (chunk: Buffer) => {
                buffer += chunk.toString();
                const lines = buffer.split('\n');
                buffer = lines.pop();
                onLog(lines);
            });
        });
    };

    const stopLogStream = () => {
        if (logStreamRef.current) {
            logStreamRef.current.destroy();
            logStreamRef.current = null;
        }
    };

    return {
        containers,
        images,
        networks,
        volumes,
        fetchContainers,
        fetchImages,
        fetchNetworks,
        fetchVolumes,
        startContainer,
        stopContainer,
        removeContainer,
        removeImage,
        removeNetwork,
        removeVolume,
        pullImage,
        inspectContainer,
        streamLogs,
        stopLogStream
    };
}
