export interface ILoadEvent {
    resourceName: string;
    targetSize?: number;
    loadedSize?: number;
    isComplete: boolean;
}


interface ILoadEventInternal {
    resourceName: string;
    targetSize: number;
    loadedSize: number;
    isComplete: boolean;
}

interface ILoadEventMap {
    [key: string] : ILoadEventInternal
}

interface ILoadPercCompute {
    Expected: number;
    Loaded: number;
    ExpectedCount: number;
    LoadedCount: number;
}

class LoaderCore 
{
    private static instance: LoaderCore;

    private __loaderEl: HTMLElement;
    private __progressEl: HTMLElement;
    private __statusEl: HTMLElement;
    private __loadEventMap: ILoadEventMap = {};
    private __timerRef: number = 0;

    private constructor(loaderEl: HTMLElement, progressEl: HTMLElement, statusEl: HTMLElement) 
    {
        this.__loaderEl = loaderEl;
        this.__progressEl = progressEl;
        this.__statusEl = statusEl;
        this.__loadEventMap = {};
        console.log("Singleton instance created!");
    }

    // Public static method to get the single instance
    public static getInstance(loaderEl: HTMLElement | null, progressEl: HTMLElement | null, statusEl: HTMLElement | null): LoaderCore | null
    {
        if (!LoaderCore.instance) {

            if(loaderEl == null || progressEl == null || statusEl == null) {
                console.error("Document not initialized, please wait");
                return null;
            }

            LoaderCore.instance = new LoaderCore(loaderEl, progressEl, statusEl);
        }

        return LoaderCore.instance;
    }

    public ShowLoader()
    {
        this.__loaderEl.style.display = 'block';
    }

    public HideLoader() 
    {
        this.__loaderEl.style.display = 'none';
    }

    public ReportProgress(evt: ILoadEvent) 
    {
        let name = evt.resourceName.toLocaleLowerCase();
        if(!Object.hasOwn(this.__loadEventMap, name)) {
            let baseEvt = {
                isComplete: false,
                loadedSize: 0,
                targetSize: 1,
                resourceName: ""
            };
            this.__loadEventMap[name] = {...baseEvt, ...evt};
        }
        else {
            this.__loadEventMap[name] = {...this.__loadEventMap[name], ...evt};
        }

        let loadedSoFar = this.ComputeLoadPerc();
        this.UpdateView(loadedSoFar);
    }

    private UpdateView(loadedPerc: ILoadPercCompute) {

        let loadingStatusText = "Loading...";

        if(loadedPerc.LoadedCount >= loadedPerc.ExpectedCount) {
            console.log("loading done... removing loader");
            loadingStatusText = `Loading... ${loadedPerc.LoadedCount} / ${loadedPerc.ExpectedCount}  -  100 %`;
            this.__timerRef = setTimeout(() => {
                console.log("LOADER REMOVED");
                setTimeout(()=> {
                    this.HideLoader();
                }, 250);
            }, 1000);
        }
        else {
            if(this.__timerRef !== 0) {
                clearTimeout(this.__timerRef);
                this.__timerRef = 0;
                console.log("loading continues...");
            }
            this.ShowLoader();
            let perc = Math.floor(loadedPerc.Loaded * 100.0 / loadedPerc.Expected);
            let percToDisplay = perc.toString().padStart(3, " ");

            this.__progressEl.style.width = perc + '%';
            loadingStatusText = `Loading... ${loadedPerc.LoadedCount} / ${loadedPerc.ExpectedCount}  -  ${percToDisplay} %`;
        }

        this.__statusEl.innerHTML = loadingStatusText;
    }

    private ComputeLoadPerc() : ILoadPercCompute {
        
        let totalExpectedSize = 0;
        let loadedSize = 0;
        let totalResources = 0;
        let loadedResources = 0;

        for (const key in this.__loadEventMap) {
            if (!Object.hasOwn(this.__loadEventMap, key)) continue;
            
            const loadEvt = this.__loadEventMap[key];
            
            totalResources++;

            if(!loadEvt.isComplete) {   
                totalExpectedSize += loadEvt.targetSize;
                loadedSize += loadEvt.loadedSize;
            } else {
                let finalSize = Math.max(loadEvt.targetSize, loadEvt.loadedSize);
                loadEvt.targetSize = finalSize;
                loadEvt.loadedSize = finalSize;
                totalExpectedSize += loadEvt.targetSize;
                loadedSize += loadEvt.loadedSize;
                loadedResources++;
            }
        }

        return {
            Expected: totalExpectedSize,
            Loaded: loadedSize,
            ExpectedCount: totalResources,
            LoadedCount: loadedResources
        } as ILoadPercCompute;
    }
}

const loaderDivId = "loader";
const loaderProgressId = "loader--width-by-perc";
const loaderStatusId = "loader--status"
export var GlobalLoader = LoaderCore.getInstance(
    document.getElementById(loaderDivId), 
    document.getElementById(loaderProgressId),
    document.getElementById(loaderStatusId)
);

export class RESOURCE {
    public static SCENE="scene-model";
    public static LEVEL_CONFIG = "level-config";
    public static TEXTURE_FIRE = "tex-fire";
}