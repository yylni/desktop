import {ipcMain, BrowserWindow} from 'electron'
import guid from '../lib/guid'

interface BackgroundProcessEvent {
  guid: string
  name: string
  args: Object
}

export default class BackgroundProcess {
  private window: Electron.BrowserWindow
  private loaded = false
  private eventQueue: BackgroundProcessEvent[] = []

  public constructor() {
    this.window = new BrowserWindow({
      width: 800,
      height: 600,
      show: false
    })

    this.window.webContents.on('did-finish-load', () => {
      this.loaded = true
      this.flushEventQueue()
    })

    this.window.loadURL(`file://${__dirname}/../../background.html`)

    if (process.env.NODE_ENV === 'development') {
      this.window.show()
      this.window.webContents.openDevTools()
    }
  }

  public async send<T>(name: string, args: Object): Promise<T> {
    const requestGuid = guid()
    this.eventQueue.push({guid: requestGuid, name, args})

    let resolve: Function = null
    const promise = new Promise<T>((_resolve, reject) => {
      resolve = _resolve
    })
    ipcMain.once(`response-${requestGuid}`, (event, args) => {
      resolve(args[0] as T)
    })

    this.flushEventQueue()
    return promise
  }

  private flushEventQueue() {
    if (!this.loaded) { return }

    for (const event of this.eventQueue) {
      this.window.webContents.send('background-command', [event])
    }

    this.eventQueue = []
  }
}
