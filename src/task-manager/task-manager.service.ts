import { Injectable, HttpService } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import * as dayjs from 'dayjs'
import * as utc from 'dayjs/plugin/utc'
import * as _isEmpty from 'lodash/isEmpty'
import * as _isNull from 'lodash/isNull'
import * as _join from 'lodash/join'
import * as _size from 'lodash/size'
import * as _map from 'lodash/map'
import * as _keys from 'lodash/keys'

import { MailerService } from '../mailer/mailer.service'
import { UserService } from '../user/user.service'
import { LetterTemplate } from '../mailer/letter'
import { AnalyticsService } from '../analytics/analytics.service'
import { ReportFrequency } from '../user/entities/user.entity'
import { clickhouse, REDIS_LOG_DATA_CACHE_KEY, redis } from '../common/constants'

dayjs.extend(utc)

@Injectable()
export class TaskManagerService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly httpService: HttpService,
    private readonly userService: UserService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async someTask(): Promise<void> {
    const data = await redis.lrange(REDIS_LOG_DATA_CACHE_KEY, 0, -1)

    if (!_isEmpty(data)) {
      await redis.del(REDIS_LOG_DATA_CACHE_KEY)
      const query = `INSERT INTO analytics (*) VALUES ${_join(data, ',')}`
      await clickhouse.query(query).toPromise()
    }
  }

  // EVERY SUNDAY AT 2:30 AM
  @Cron('30 02 * * 0')
  async weeklyReportsHandler(): Promise<void> {
    const users = await this.userService.findWhereWithRelations({
      reportFrequency: ReportFrequency.Weekly,
    }, ['projects'])
    const now = dayjs.utc().format('DD.MM.YYYY')
    const weekAgo = dayjs.utc().subtract(1, 'w').format('DD.MM.YYYY')
    const date = `${weekAgo} - ${now}`

    for (let i = 0; i < _size(users); ++i) {
      if (_isEmpty(users[i]?.projects) || _isNull(users[i]?.projects)) {
        continue
      }

      const ids = _map(users[i].projects, (p) => p.id)
      const data = await this.analyticsService.getSummary(ids, 'w', true)

      const result = {
        type: 'w', // week
        date,
        projects: _map(ids, (pid, index) => ({
          data: data[pid],
          name: users[i].projects[index].name,
        })),
      }

      // todo: maybe this should be sent as a broadcast stream
      await this.mailerService.sendEmail(users[i].email, LetterTemplate.ProjectReport, result)
    }
  }

  // ON THE FIRST DAY OF EVERY MONTH AT 2 AM
  @Cron('0 02 1 * *')
  async monthlyReportsHandler(): Promise<void> {
    const users = await this.userService.findWhereWithRelations({
      reportFrequency: ReportFrequency.Weekly,
    }, ['projects'])
    const now = dayjs.utc().format('DD.MM.YYYY')
    const weekAgo = dayjs.utc().subtract(1, 'M').format('DD.MM.YYYY')
    const date = `${weekAgo} - ${now}`

    for (let i = 0; i < _size(users); ++i) {
      if (_isEmpty(users[i]?.projects) || _isNull(users[i]?.projects)) {
        continue
      }

      const ids = _map(users[i].projects, (p) => p.id)
      const data = await this.analyticsService.getSummary(ids, 'M', true)

      const result = {
        type: 'M', // month
        date,
        projects: _map(ids, (pid, index) => ({
          data: data[pid],
          name: users[i].projects[index].name,
        })),
      }

      // todo: maybe this should be sent as a broadcast stream
      await this.mailerService.sendEmail(users[i].email, LetterTemplate.ProjectReport, result)
    }
  }
}
