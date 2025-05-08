// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {IntlShape} from 'react-intl'

import {Options} from '../../components/calculations/options'
import {PropertyType, PropertyTypeEnum, FilterValueType} from '../types'

import Checkbox from './checkbox'

export default class CheckboxProperty extends PropertyType {
    Editor = Checkbox
    name = 'Checkbox'
    type = 'checkbox' as PropertyTypeEnum
    displayName = (intl: IntlShape) => intl.formatMessage({id: 'PropertyType.Checkbox', defaultMessage: 'Onay kutusu'})
    canFilter = true
    filterValueType = 'boolean' as FilterValueType
    calculationOptions = [Options.none, Options.count, Options.countChecked,
        Options.countUnchecked, Options.percentChecked, Options.percentUnchecked]
}
