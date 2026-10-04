export interface Result<T = any> {
    code: number
    msg: string
    data: T
}

export interface PageResult<T> {
    total: number
    records: T[]
}

export interface PageQuery {
    page: number
    pageSize: number
}