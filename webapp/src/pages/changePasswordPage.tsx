// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useState} from 'react'
import {Link} from 'react-router-dom'

import Button from '../widgets/buttons/button'
import client from '../octoClient'
import './changePasswordPage.scss'
import {IUser} from '../user'
import {useAppSelector} from '../store/hooks'
import {getMe} from '../store/users'

const ChangePasswordPage = () => {
    const [oldPassword, setOldPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [errorMessage, setErrorMessage] = useState('')
    const [succeeded, setSucceeded] = useState(false)
    const user = useAppSelector<IUser|null>(getMe)

    if (!user) {
        return (
            <div className='ChangePasswordPage'>
                <div className='title'>{'Şifre Değiştir'}</div>
                <Link to='/login'>{'Önce giriş yapın'}</Link>
            </div>
        )
    }

    const handleSubmit = async (userId: string): Promise<void> => {
        const response = await client.changePassword(userId, oldPassword, newPassword)
        if (response.code === 200) {
            setOldPassword('')
            setNewPassword('')
            setErrorMessage('')
            setSucceeded(true)
        } else {
            setErrorMessage(`Şifre değiştirme başarısız: ${response.json?.error}`)
        }
    }

    return (
        <div className='ChangePasswordPage'>
            <div className='title'>{'Şifre Değiştir'}</div>
            <form
                onSubmit={(e: React.FormEvent) => {
                    e.preventDefault()
                    handleSubmit(user.id)
                }}
            >
                <div className='oldPassword'>
                    <input
                        id='login-oldpassword'
                        type='password'
                        placeholder={'Mevcut şifreyi girin'}
                        value={oldPassword}
                        onChange={(e) => {
                            setOldPassword(e.target.value)
                            setErrorMessage('')
                        }}
                    />
                </div>
                <div className='newPassword'>
                    <input
                        id='login-newpassword'
                        type='password'
                        placeholder={'Yeni şifreyi girin'}
                        value={newPassword}
                        onChange={(e) => {
                            setNewPassword(e.target.value)
                            setErrorMessage('')
                        }}
                    />
                </div>
                <Button
                    filled={true}
                    submit={true}
                >
                    {'Şifre değiştir'}
                </Button>
            </form>
            {errorMessage &&
                <div className='error'>
                    {errorMessage}
                </div>
            }
            {succeeded &&
                <Link
                    className='succeeded'
                    to='/'
                >{'Şifre değiştirildi, devam etmek için tıklayın.'}</Link>
            }
            {!succeeded &&
                <Link to='/'>{'İptal'}</Link>
            }
        </div>
    )
}

export default React.memo(ChangePasswordPage)
