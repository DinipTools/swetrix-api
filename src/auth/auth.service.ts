import { Injectable, UnprocessableEntityException } from '@nestjs/common'
import { sign } from 'jsonwebtoken'
import * as bcrypt from 'bcrypt'

import { UserService } from '../user/user.service'
import { User } from '../user/entities/user.entity'
import {
  isSelfhosted, JWT_LIFE_TIME, SELFHOSTED_UUID,
} from '../common/constants'

const BCRYPT_SALT_ROUNDS = 10

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
  ) {}

  async hashPassword(pass: string): Promise<string> {
    const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS)
    return await bcrypt.hash(pass, salt)
  }

  async checkPassword(passToCheck: string, hashedPass: string): Promise<boolean> {
    return await bcrypt.compare(passToCheck, hashedPass)
  }

  async validateUser(email: string, pass: string): Promise<User> {
    const user = await this.userService.findOneWhere({ email })

    if (user && await this.checkPassword(pass, user.password)) {
      return user
    }

    throw new UnprocessableEntityException('Email or password is incorrect')
  }

  async login(user: User | string): Promise<any> {
    let userData = user

    if (isSelfhosted) {
      // @ts-ignore
      userData = {
        id: SELFHOSTED_UUID,
      }
    }
    
    // @ts-ignore
    const token = sign({ user_id: user.id }, process.env.JWT_SECRET, {
      expiresIn: JWT_LIFE_TIME,
    })

    // @ts-ignore
    delete user.password
    return { access_token: token, user }
  }
}
